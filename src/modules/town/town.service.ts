import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Town } from './entities/town.entity';
import { CreateTownDto } from './dto/create-town.dto';
import { Lap } from '../lap/entities/lap.entity';
import { EnumerationArea } from '../enumeration-area/entities/enumeration-area.entity';

@Injectable()
export class TownService {
  constructor(
    @Inject('TOWN_REPOSITORY')
    private readonly townRepository: typeof Town,
  ) {}

  async findAll(dzongkhagId?: number): Promise<Town[]> {
    const where = dzongkhagId ? { dzongkhagId } : {};
    return this.townRepository.findAll({
      where,
      include: [{ model: Lap, include: [{ model: EnumerationArea }] }],
    });
  }

  async findOne(id: number): Promise<Town> {
    const town = await this.townRepository.findByPk(id, {
      include: [{ model: Lap, include: [{ model: EnumerationArea }] }],
    });
    if (!town) {
      throw new NotFoundException(`Town with ID ${id} not found`);
    }
    return town;
  }

  async create(dto: CreateTownDto): Promise<Town> {
    return this.townRepository.create({ ...dto });
  }
}
