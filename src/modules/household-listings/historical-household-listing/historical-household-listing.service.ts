import { Inject, Injectable, ConflictException } from '@nestjs/common';
import { HistoricalHouseholdListing } from './entities/historical-household-listing.entity';
import { CreateHistoricalHouseholdListingDto } from './dto/create-historical-household-listing.dto';
import { UpdateHistoricalHouseholdListingDto } from './dto/update-historical-household-listing.dto';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class HistoricalHouseholdListingService {
  constructor(
    @Inject('HISTORICAL_HOUSEHOLD_LISTING_REPOSITORY')
    private readonly historicalHouseholdListingRepository: typeof HistoricalHouseholdListing,
  ) {}

  /**
   * Create a new historical household listing
   * @param createHistoricalHouseholdListingDto - Create data
   */
  async create(
    createHistoricalHouseholdListingDto: CreateHistoricalHouseholdListingDto,
  ): Promise<HistoricalHouseholdListing> {
    try {
      return await this.historicalHouseholdListingRepository.create(
        instanceToPlain(createHistoricalHouseholdListingDto),
      );
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictException(
          `Historical household listing for enumeration area ${createHistoricalHouseholdListingDto.enumerationAreaId} and year ${createHistoricalHouseholdListingDto.year} already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Find all historical household listings ordered by year ascending
   * @param enumerationAreaId - Optional filter by enumeration area
   */
  async findAll(
    enumerationAreaId?: number,
  ): Promise<HistoricalHouseholdListing[]> {
    const whereClause = enumerationAreaId ? { enumerationAreaId } : {};

    return await this.historicalHouseholdListingRepository.findAll<HistoricalHouseholdListing>(
      {
        where: whereClause,
        include: ['enumerationArea'],
        order: [['year', 'ASC']],
      },
    );
  }

  /**
   * Find historical household listings by enumeration area
   * @param enumerationAreaId - Enumeration Area ID
   */
  async findByEnumerationArea(
    enumerationAreaId: number,
  ): Promise<HistoricalHouseholdListing[]> {
    return await this.historicalHouseholdListingRepository.findAll<HistoricalHouseholdListing>(
      {
        where: { enumerationAreaId },
        include: ['enumerationArea'],
        order: [['year', 'ASC']],
      },
    );
  }

  /**
   * Find single historical household listing by ID
   * @param id - Historical Household Listing ID
   */
  async findOne(id: number): Promise<HistoricalHouseholdListing> {
    return await this.historicalHouseholdListingRepository.findOne<HistoricalHouseholdListing>(
      {
        where: { id },
        include: ['enumerationArea'],
      },
    );
  }

  /**
   * Update historical household listing
   * @param id - Historical Household Listing ID
   * @param updateHistoricalHouseholdListingDto - Update data
   */
  async update(
    id: number,
    updateHistoricalHouseholdListingDto: UpdateHistoricalHouseholdListingDto,
  ) {
    try {
      const [numRows] = await this.historicalHouseholdListingRepository.update(
        instanceToPlain(updateHistoricalHouseholdListingDto),
        {
          where: { id },
        },
      );

      if (numRows === 0) {
        throw new Error(`Historical household listing with ID ${id} not found`);
      }

      return this.findOne(id);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictException(
          `Historical household listing for this enumeration area and year combination already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Remove historical household listing
   * @param id - Historical Household Listing ID
   */
  async remove(id: number): Promise<number> {
    return await this.historicalHouseholdListingRepository.destroy({
      where: { id },
    });
  }
}
