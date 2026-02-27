import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
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
    return this.householdListingRepository.create(
      instanceToPlain(createHouseholdListingDto) as any,
    );
  }

  async bulkCreate(
    dtos: CreateHouseholdListingDto[],
  ): Promise<HouseholdListing[]> {
    const payloads = dtos.map((dto) => instanceToPlain(dto) as any);
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
}
