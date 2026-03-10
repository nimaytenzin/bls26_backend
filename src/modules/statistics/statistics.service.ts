import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { HouseholdListing } from '../household-listing/entities/household-listing.entity';
import { User } from '../auth/entities/user.entity';
import { DzongkhagService } from '../dzongkhag/dzongkhag.service';
import { EnumerationArea } from '../enumeration-area/entities/enumeration-area.entity';
import { Structure } from '../structure/entities/structure.entity';
import { Dzongkhag } from '../dzongkhag/entities/dzongkhag.entity';
import { Lap } from '../lap/entities/lap.entity';
import { Town } from '../town/entities/town.entity';

@Injectable()
export class StatisticsService {
  constructor(
    @Inject('HOUSEHOLD_LISTING_REPOSITORY')
    private readonly householdListingRepository: typeof HouseholdListing,
    @Inject('USER_REPOSITORY')
    private readonly userRepository: typeof User,
    private readonly dzongkhagService: DzongkhagService,
    @Inject('ENUMERATION_AREA_REPOSITORY')
    private readonly enumerationAreaRepository: typeof EnumerationArea,
    @Inject('STRUCTURE_REPOSITORY')
    private readonly structureRepository: typeof Structure,
  ) {}

  async getEnumeratorStats(userId: number): Promise<{
    userId: number;
    totalHouseholdsSubmitted: number;
  }> {
    const user = await this.userRepository.findByPk(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const totalHouseholdsSubmitted =
      await this.householdListingRepository.count({
        where: { userId },
      });
    return {
      userId,
      totalHouseholdsSubmitted,
    };
  }

  async exportData(format: 'json' | 'csv' = 'json'): Promise<any> {
    const listings = await this.householdListingRepository.findAll({
      include: [
        { association: 'structure', include: ['enumerationArea'] },
        {
          association: 'user',
          attributes: ['id', 'name', 'cid'],
          exclude: ['password'],
        } as any,
      ],
    });
    const data = listings.map((l) => (l as any).toJSON());
    if (format === 'csv') {
      return this.toCsv(data);
    }
    return data;
  }

  /**
   * EA-level summary: structures, households, population, grouped by Dzongkhag/Town/LAP.
   */
  async exportEaSummary(options: {
    dzongkhagId?: number;
    format?: 'json' | 'csv';
  }): Promise<any> {
    const { dzongkhagId, format = 'json' } = options;

    const dzongkhags = await this.dzongkhagService.findAll();
    const filteredDzongkhags = dzongkhagId
      ? dzongkhags.filter((d) => d.id === dzongkhagId)
      : dzongkhags;

    const rows: any[] = [];

    for (const dz of filteredDzongkhags) {
      const dzName = dz.name;
      const dzCode = dz.areaCode;
      for (const town of (dz as any).towns ?? []) {
        const townName = town.name;
        const townCode = town.areaCode;
        for (const lap of town.laps ?? []) {
          const lapName = lap.name;
          const lapCode = lap.areaCode;
          for (const ea of lap.enumerationAreas ?? []) {
            const structures = (ea as any).structures ?? [];
            const structureCount = structures.length;
            let householdCount = 0;
            let population = 0;

            for (const s of structures) {
              const households = (s as any).householdListings ?? [];
              householdCount += households.length;
              for (const h of households) {
                population +=
                  (h.totalMale ?? 0) + (h.totalFemale ?? 0);
              }
            }

            rows.push({
              dzongkhag: dzName,
              dzongkhagCode: dzCode,
              town: townName,
              townCode,
              lap: lapName,
              lapCode,
              enumerationArea: ea.name,
              enumerationAreaCode: ea.areaCode,
              fullEaCode: ea.fullEaCode,
              geom: (ea as any).geom ? 'Yes' : 'No',
              status: ea.status,
              structures: structureCount,
              households: householdCount,
              population,
            });
          }
        }
      }
    }

    if (format === 'csv') {
      const headers = [
        'dzongkhag',
        'dzongkhagCode',
        'town',
        'townCode',
        'lap',
        'lapCode',
        'enumerationArea',
        'enumerationAreaCode',
        'fullEaCode',
        'geom',
        'status',
        'structures',
        'households',
        'population',
      ];
      return this.toCsv(rows, headers);
    }

    return rows;
  }

  /**
   * Detailed household listing including geography, ordered by codes.
   */
  async exportHouseholdDetails(options: {
    dzongkhagId?: number;
    eaId?: number;
    format?: 'json' | 'csv';
  }): Promise<any> {
    const { dzongkhagId, eaId, format = 'json' } = options;

    if (dzongkhagId && eaId) {
      throw new NotFoundException(
        'Specify either dzongkhagId or eaId, not both',
      );
    }

    if (eaId) {
      // Restrict by EA using EnumerationArea -> Structures
      const ea = await this.enumerationAreaRepository.findByPk(eaId);
      if (!ea) {
        throw new NotFoundException(
          `Enumeration area with ID ${eaId} not found`,
        );
      }
    }

    const listings = await this.householdListingRepository.findAll({
      include: [
        {
          model: Structure,
          include: [
            {
              model: EnumerationArea,
              include: [
                { model: Dzongkhag },
                {
                  model: Lap,
                  include: [Town],
                },
              ],
            },
          ],
        },
        {
          model: User,
          attributes: ['id', 'name'],
        },
      ],
    });

    const rows: any[] = [];

    for (const l of listings) {
      const json: any = (l as any).toJSON();
      const structure = json.structure;
      const ea = structure?.enumerationArea;
      const dz = ea?.dzongkhag as Dzongkhag | undefined;
      const lap = ea?.lap as Lap | undefined;
      const town = lap?.town as Town | undefined;

      if (eaId && ea?.id !== eaId) {
        continue;
      }

      if (dzongkhagId && ea?.dzongkhagId !== dzongkhagId) {
        continue;
      }

      const createdAt =
        json.createdAt != null ? new Date(json.createdAt) : null;
      const createdAtReadable = createdAt
        ? createdAt.toISOString().split('T')[0]
        : '';

      const updatedByName: string = json.user?.name ?? '';

      rows.push({
        dzongkhagName: dz?.name ?? null,
        dzongkhagCode: dz?.areaCode ?? null,
        townName: town?.name ?? null,
        townCode: town?.areaCode ?? null,
        lapName: lap?.name ?? null,
        lapCode: lap?.areaCode ?? null,
        eaId: ea?.id ?? null,
        eaName: ea?.name ?? null,
        eaAreaCode: ea?.areaCode ?? null,
        fullEaCode: ea?.fullEaCode ?? null,
        structureNumber: structure?.structureNumber ?? null,
        structureLat: structure?.latitude ?? null,
        structureLng: structure?.longitude ?? null,
        householdIdentification: json.householdIdentification,
        householdSerialNumber: json.householdSerialNumber,
        nameOfHOH: json.nameOfHOH,
        totalMale: json.totalMale,
        totalFemale: json.totalFemale,
        phoneNumber: json.phoneNumber,
        remarks: json.remarks,
        createdAt: createdAtReadable,
        updatedByName,
      });
    }

    rows.sort((a, b) => {
      const k = (x: any) =>
        [
          x.dzongkhagCode ?? '',
          x.townCode ?? '',
          x.lapCode ?? '',
          x.eaAreaCode ?? '',
          x.structureNumber ?? '',
          x.householdSerialNumber ?? 0,
        ].join('|');
      return k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0;
    });

    if (format === 'csv') {
      const headers = [
        'dzongkhagName',
        'dzongkhagCode',
        'townName',
        'townCode',
        'lapName',
        'lapCode',
        'eaId',
        'eaName',
        'eaAreaCode',
        'fullEaCode',
        'structureNumber',
        'structureLat',
        'structureLng',
        'householdIdentification',
        'householdSerialNumber',
        'nameOfHOH',
        'totalMale',
        'totalFemale',
        'phoneNumber',
        'remarks',
        'createdAt',
        'updatedByName',
      ];
      return this.toCsv(rows, headers);
    }

    return rows;
  }

  private toCsv(rows: any[], headers?: string[]): string {
    if (rows.length === 0) return '';
    const cols = headers && headers.length ? headers : Object.keys(rows[0]);
    const escape = (v: any) => {
      const s =
        v !== null && typeof v === 'object'
          ? JSON.stringify(v)
          : String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const lines = [
      cols.join(','),
      ...rows.map((r) => cols.map((h) => escape(r[h])).join(',')),
    ];
    return lines.join('\n');
  }
}
