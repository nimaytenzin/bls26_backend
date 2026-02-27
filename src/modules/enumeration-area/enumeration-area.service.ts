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
