import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import { Dzongkhag } from './entities/dzongkhag.entity';
import { CreateDzongkhagDto } from './dto/create-dzongkhag.dto';
import { UpdateDzongkhagDto } from './dto/update-dzongkhag.dto';
import { instanceToPlain } from 'class-transformer';
import { EnumerationArea } from '../enumeration-area/entities/enumeration-area.entity';
import { Town } from '../town/entities/town.entity';
import { Lap } from '../lap/entities/lap.entity';
import { Structure } from '../structure/entities/structure.entity';
import { HouseholdListing } from '../household-listing/entities/household-listing.entity';

@Injectable()
export class DzongkhagService {
  constructor(
    @Inject('DZONGKHAG_REPOSITORY')
    private readonly dzongkhagRepository: typeof Dzongkhag,
    @Inject('ENUMERATION_AREA_REPOSITORY')
    private readonly enumerationAreaRepository: typeof EnumerationArea,
    @Inject('STRUCTURE_REPOSITORY')
    private readonly structureRepository: typeof Structure,
    @Inject('HOUSEHOLD_LISTING_REPOSITORY')
    private readonly householdListingRepository: typeof HouseholdListing,
  ) {}

  async findAll(): Promise<Dzongkhag[]> {
    return this.dzongkhagRepository.findAll({
      include: [
        {
          model: Town,
          include: [
            {
              model: Lap,
              include: [
                {
                  model: EnumerationArea,
                  include: [
                    {
                      model: Structure,
                      include: [{ model: HouseholdListing }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  }

  async findOne(id: number): Promise<Dzongkhag> {
    const dzongkhag = await this.dzongkhagRepository.findByPk(id);
    if (!dzongkhag) {
      throw new NotFoundException(`Dzongkhag with ID ${id} not found`);
    }
    return dzongkhag;
  }

  async getStatistics(
    id: number,
  ): Promise<{
    dzongkhagId: number;
    totalEnumerationAreas: number;
    totalStructures: number;
    totalHouseholds: number;
  }> {
    await this.findOne(id);
    const totalEnumerationAreas = await this.enumerationAreaRepository.count({
      where: { dzongkhagId: id },
    });
    const eaIds = (
      await this.enumerationAreaRepository.findAll({
        where: { dzongkhagId: id },
        attributes: ['id'],
      })
    ).map((ea) => ea.id);
    const totalStructures =
      eaIds.length === 0
        ? 0
        : await this.structureRepository.count({
            where: { enumerationAreaId: { [Op.in]: eaIds } },
          });
    const structureIds =
      eaIds.length === 0
        ? []
        : (
            await this.structureRepository.findAll({
              where: { enumerationAreaId: { [Op.in]: eaIds } },
              attributes: ['id'],
            })
          ).map((s) => s.id);
    const totalHouseholds =
      structureIds.length === 0
        ? 0
        : await this.householdListingRepository.count({
            where: { structureId: { [Op.in]: structureIds } },
          });
    return {
      dzongkhagId: id,
      totalEnumerationAreas,
      totalStructures,
      totalHouseholds,
    };
  }

  


  /**
   * Get enumeration areas by dzongkhag with full hierarchy
   */
  async getEnumerationAreasByDzongkhag(
    dzongkhagId: number,
    includeHierarchy: boolean = true,
  ): Promise<any> {
    if (includeHierarchy) {
      const dzongkhag = await this.dzongkhagRepository.findOne({
        where: { id: dzongkhagId },
        include: [
          {
            model: Town,
            include: [
              {
                model: Lap,
                include: [{ model: EnumerationArea }],
              },
            ],
          },
        ],
      });
      if (!dzongkhag) {
        throw new NotFoundException(`Dzongkhag with ID ${dzongkhagId} not found`);
      }
      return dzongkhag;
    }
  }

  async create(createDzongkhagDto: CreateDzongkhagDto): Promise<Dzongkhag> {
    return await this.dzongkhagRepository.create(
      instanceToPlain(createDzongkhagDto),
    );
  }

}
