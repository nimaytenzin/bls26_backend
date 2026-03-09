import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EnumerationArea } from './entities/enumeration-area.entity';
import { CreateEnumerationAreaDto } from './dto/create-enumeration-area.dto';
import { instanceToPlain } from 'class-transformer';
import { Dzongkhag } from '../dzongkhag/entities/dzongkhag.entity';
import { Structure } from '../structure/entities/structure.entity';
import { HouseholdListing } from '../household-listing/entities/household-listing.entity';
import { EnumerationAreaStatus } from './enums/enumeration-area-status.enum';

@Injectable()
export class EnumerationAreaService {
  constructor(
    @Inject('ENUMERATION_AREA_REPOSITORY')
    private readonly enumerationAreaRepository: typeof EnumerationArea,
    @Inject('STRUCTURE_REPOSITORY')
    private readonly structureRepository: typeof Structure,
    @Inject('HOUSEHOLD_LISTING_REPOSITORY')
    private readonly householdListingRepository: typeof HouseholdListing,
  ) {}

  async create(
    createEnumerationAreaDto: CreateEnumerationAreaDto,
  ): Promise<EnumerationArea> {
    const payload = {
      ...instanceToPlain(createEnumerationAreaDto),
      status:
        createEnumerationAreaDto.status ?? EnumerationAreaStatus.INCOMPLETE,
    };
    return this.enumerationAreaRepository.create(payload as any);
  }

  async findAll(
    dzongkhagId?: number,
    status?: EnumerationAreaStatus,
  ): Promise<EnumerationArea[]> {
    const where: any = {};
    if (dzongkhagId != null) where.dzongkhagId = dzongkhagId;
    if (status != null) where.status = status;

    return this.enumerationAreaRepository.findAll({
      where,
    });
  }

  async findOne(
    id: number,
    withGeom = false,
    includeStructures = false,
  ): Promise<EnumerationArea> {
 

    const ea = await this.enumerationAreaRepository.findByPk(id, {
     
      include: [{ model: Structure , include: [{ model: HouseholdListing }]}],
    });
   
    return ea;
  }


  async remove(id: number): Promise<void> {
    const ea = await this.enumerationAreaRepository.findByPk(id);
    if (!ea) {
      throw new NotFoundException(`Enumeration area with ID ${id} not found`);
    }
    await ea.destroy();
  }

  async updateStatus(
    id: number,
    status: EnumerationAreaStatus,
  ): Promise<EnumerationArea> {
    const ea = await this.findOne(id, false, false);
    await ea.update({ status });
    return this.findOne(id, false, false);
  }

  async getProgress(id: number): Promise<{
    totalStructures: number;
    totalHouseholds: number;
    status: EnumerationAreaStatus;
  }> {
    const ea = await this.findOne(id, false, false);
    const totalStructures = await this.structureRepository.count({
      where: { enumerationAreaId: id },
    });
    const structureIds = (
      await this.structureRepository.findAll({
        where: { enumerationAreaId: id },
        attributes: ['id'],
      })
    ).map((s) => s.id);
    const totalHouseholds =
      structureIds.length === 0
        ? 0
        : await this.householdListingRepository.count({
            where: { structureId: structureIds },
          });
    return {
      totalStructures,
      totalHouseholds,
      status: ea.status as EnumerationAreaStatus,
    };
  }

  /** Fetch geometry for a single EA by its fullEaCode and save to geom. */
  private async fetchAndUpdateGeomForEa(ea: EnumerationArea): Promise<void> {
    const fullCode = (ea.fullEaCode || '').trim();
    if (!fullCode || fullCode.length !== 8 || !/^\d{8}$/.test(fullCode)) {
      throw new BadRequestException(
        `Enumeration area ${ea.id} does not have a valid 8‑digit fullEaCode`,
      );
    }

    const url = `http://localhost:3000/enumeration-area/geojson/by-full-code/${fullCode}`;
    const response = await fetch(url as any);
    if (!response.ok) {
      throw new BadRequestException(
        `Failed to fetch geometry for fullEaCode ${fullCode} (status ${response.status})`,
      );
    }

    const data: any = await response.json();
    const geomToSave = data?.geometry ?? data?.geom ?? null;

    if (!geomToSave) {
      throw new BadRequestException(
        `GeoJSON response for fullEaCode ${fullCode} did not contain a geometry`,
      );
    }

    await ea.update({ geom: geomToSave });
  }

  /** Update geom for a single EA, optionally accepting geometry directly. */
  async updateGeom(id: number, geom?: object): Promise<EnumerationArea> {
    const ea = await this.enumerationAreaRepository.findByPk(id);
    if (!ea) {
      throw new NotFoundException(`Enumeration area with ID ${id} not found`);
    }

    if (geom) {
      await ea.update({ geom });
      return ea;
    }

    await this.fetchAndUpdateGeomForEa(ea);
    return ea;
  }

  /** Update geom for all EAs using their fullEaCode and the GeoJSON service. */
  async updateAllGeom(): Promise<{
    updated: number;
    skippedNoCode: number;
    failed: number;
  }> {
    const eas = await this.enumerationAreaRepository.findAll();

    let updated = 0;
    let skippedNoCode = 0;
    let failed = 0;

    for (const ea of eas) {
      const fullCode = (ea.fullEaCode || '').trim();
      if (!fullCode || fullCode.length !== 8 || !/^\d{8}$/.test(fullCode)) {
        skippedNoCode += 1;
        continue;
      }

      try {
        await this.fetchAndUpdateGeomForEa(ea);
        updated += 1;
      } catch {
        failed += 1;
      }
    }

    return { updated, skippedNoCode, failed };
  }

  async complete(id: number): Promise<EnumerationArea> {
    const ea = await this.findOne(id, false, false);
    const validation = await this.checkEaCompletion(id);
    if (!validation.ready) {
      throw new BadRequestException({
        message: 'EA is not ready to be completed',
        errors: validation.errors,
      });
    }
    await ea.update({ status: EnumerationAreaStatus.COMPLETED });
    return this.findOne(id, false, false);
  }

  async checkEaCompletion(
    eaId: number,
  ): Promise<{ ready: boolean; errors: string[] }> {
    const errors: string[] = [];
    const ea = await this.enumerationAreaRepository.findByPk(eaId);
    if (!ea) {
      return { ready: false, errors: ['Enumeration area not found'] };
    }
    const structureCount = await this.structureRepository.count({
      where: { enumerationAreaId: eaId },
    });
    if (structureCount === 0) {
      errors.push('EA must have at least one structure');
    }
    return {
      ready: errors.length === 0,
      errors,
    };
  }
}
