import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Structure } from './entities/structure.entity';
import { CreateStructureDto } from './dto/create-structure.dto';
import { UpdateStructureDto } from './dto/update-structure.dto';
import { instanceToPlain } from 'class-transformer';
import { HouseholdListing } from '../household-listing/entities/household-listing.entity';

@Injectable()
export class StructureService {
  constructor(
    @Inject('STRUCTURE_REPOSITORY')
    private readonly structureRepository: typeof Structure,
  ) {}

  async create(createStructureDto: CreateStructureDto): Promise<Structure> {
    return this.structureRepository.create(
      instanceToPlain(createStructureDto) as any,
    );
  }

  async findAll(enumerationAreaId?: number): Promise<Structure[]> {
    const where = enumerationAreaId
      ? { enumerationAreaId }
      : {};
    return this.structureRepository.findAll({
      where,
      include: [{ model: HouseholdListing, as: 'householdListings' }],
    });
  }

  async findOne(id: number): Promise<Structure> {
    const structure = await this.structureRepository.findByPk(id, {
      include: [{ model: HouseholdListing, as: 'householdListings' }],
    });
    if (!structure) {
      throw new NotFoundException(`Structure with ID ${id} not found`);
    }
    return structure;
  }

  async update(id: number, updateStructureDto: UpdateStructureDto): Promise<Structure> {
    const structure = await this.findOne(id);
    await structure.update(instanceToPlain(updateStructureDto) as any);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const structure = await this.findOne(id);
    await structure.destroy();
  }

  async bulkCreate(
    createStructureDtos: CreateStructureDto[],
  ): Promise<Structure[]> {
    const payloads = createStructureDtos.map((dto) =>
      instanceToPlain(dto) as any,
    );
    return this.structureRepository.bulkCreate(payloads);
  }

  async getNextStructureNumber(enumerationAreaId: number): Promise<number> {
    const structures = await this.structureRepository.findAll({
      where: { enumerationAreaId },
      attributes: ['structureNumber'],
      order: [['structureNumber', 'DESC']],
      limit: 1,
    });
    if (structures.length === 0) return 1;
    const last = structures[0].structureNumber;
    const num = parseInt(String(last), 10);
    return isNaN(num) ? 1 : num + 1;
  }

  async isStructureNumberUnique(
    enumerationAreaId: number,
    structureNumber: string,
  ): Promise<boolean> {
    const count = await this.structureRepository.count({
      where: { enumerationAreaId, structureNumber },
    });
    return count === 0;
  }

  async getNextStructureNumberForStructure(structureId: number): Promise<{ nextNumber: number }> {
    const structure = await this.structureRepository.findByPk(structureId);
    if (!structure) {
      throw new NotFoundException(
        `Structure with ID ${structureId} not found`,
      );
    }
    const nextNumber = await this.getNextStructureNumber(structure.enumerationAreaId);
    return { nextNumber };
  }
}
