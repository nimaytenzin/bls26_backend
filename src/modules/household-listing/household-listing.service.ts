import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Op, fn, col } from 'sequelize';
import { HouseholdListing } from './entities/household-listing.entity';
import { CreateHouseholdListingDto } from './dto/create-household-listing.dto';
import { UpdateHouseholdListingDto } from './dto/update-household-listing.dto';
import { instanceToPlain } from 'class-transformer';
import { Structure } from '../structure/entities/structure.entity';

export interface HouseholdListingFilters {
  eaId?: number;
  userId?: number;
  structureId?: number;
}

@Injectable()
export class HouseholdListingService {
  constructor(
    @Inject('HOUSEHOLD_LISTING_REPOSITORY')
    private readonly householdListingRepository: typeof HouseholdListing,
    @Inject('STRUCTURE_REPOSITORY')
    private readonly structureRepository: typeof Structure,
  ) {}

  async create(
    createHouseholdListingDto: CreateHouseholdListingDto,
  ): Promise<HouseholdListing> {
    const payload = instanceToPlain(createHouseholdListingDto) as any;
    if (!payload.householdSerialNumber) {
      payload.householdSerialNumber = await this.getNextSerialNumber(payload.structureId);
    }
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.householdListingRepository.create(payload);
      } catch (err) {
        const isUniqueViolation =
          err.name === 'SequelizeUniqueConstraintError' ||
          (err.name === 'SequelizeValidationError' && err.errors?.some((e: any) => e.type === 'unique violation'));
        if (isUniqueViolation && attempt < maxRetries - 1) {
          payload.householdSerialNumber = await this.getNextSerialNumber(payload.structureId);
          continue;
        }
        throw err;
      }
    }
  }

  async bulkCreate(
    dtos: CreateHouseholdListingDto[],
  ): Promise<HouseholdListing[]> {
    const payloads = dtos.map((dto) => instanceToPlain(dto) as any);
    // Auto-assign serial numbers for entries missing them
    const structureIds = [...new Set(payloads.filter((p) => !p.householdSerialNumber).map((p) => p.structureId))];
    const nextSerials = new Map<number, number>();
    for (const sid of structureIds) {
      nextSerials.set(sid, await this.getNextSerialNumber(sid));
    }
    for (const payload of payloads) {
      if (!payload.householdSerialNumber) {
        const next = nextSerials.get(payload.structureId) ?? 1;
        payload.householdSerialNumber = next;
        nextSerials.set(payload.structureId, next + 1);
      }
    }
    return this.householdListingRepository.bulkCreate(payloads);
  }

  async findAll(filters: HouseholdListingFilters = {}): Promise<HouseholdListing[]> {
    const where: any = {};
    if (filters.userId != null) where.userId = filters.userId;
    if (filters.structureId != null) where.structureId = filters.structureId;
    if (filters.eaId != null) {
      const structureIds = (
        await this.structureRepository.findAll({
          where: { enumerationAreaId: filters.eaId },
          attributes: ['id'],
        })
      ).map((s) => s.id);
      if (structureIds.length === 0) return [];
      where.structureId = { [Op.in]: structureIds };
    }
    return this.householdListingRepository.findAll({ where });
  }

  async findByUser(userId: number): Promise<HouseholdListing[]> {
    return this.findAll({ userId });
  }

  async findByStructure(structureId: number): Promise<HouseholdListing[]> {
    return this.findAll({ structureId });
  }

  private async getNextSerialNumber(structureId: number): Promise<number> {
    const result = await this.householdListingRepository.findOne({
      where: { structureId },
      attributes: [[fn('MAX', col('householdSerialNumber')), 'maxSerial']],
      raw: true,
    });
    const maxSerial = (result as any)?.maxSerial ?? 0;
    return maxSerial + 1;
  }

  async isHouseholdSerialUnique(
    structureId: number,
    householdSerialNumber: number,
  ): Promise<boolean> {
    const count = await this.householdListingRepository.count({
      where: { structureId, householdSerialNumber },
    });
    return count === 0;
  }

  async findOne(id: number): Promise<HouseholdListing> {
    const listing = await this.householdListingRepository.findByPk(id);
    if (!listing) {
      throw new NotFoundException(`Household listing with ID ${id} not found`);
    }
    return listing;
  }

  async update(
    id: number,
    updateHouseholdListingDto: UpdateHouseholdListingDto,
  ): Promise<HouseholdListing> {
    const listing = await this.findOne(id);
    await listing.update(instanceToPlain(updateHouseholdListingDto) as any);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const listing = await this.findOne(id);
    await listing.destroy();
  }

  /**
   * Delete all household listings for a given Enumeration Area.
   */
  async removeByEa(eaId: number): Promise<number> {
    const structures = await this.structureRepository.findAll({
      where: { enumerationAreaId: eaId },
      attributes: ['id'],
    });
    const structureIds = structures.map((s) => s.id);
    if (structureIds.length === 0) {
      return 0;
    }
    const deleted = await this.householdListingRepository.destroy({
      where: { structureId: { [Op.in]: structureIds } },
    });
    return deleted;
  }
}
