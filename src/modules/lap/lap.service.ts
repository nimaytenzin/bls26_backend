import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Lap } from './entities/lap.entity';
import { CreateLapDto } from './dto/create-lap.dto';
import { EnumerationArea } from '../enumeration-area/entities/enumeration-area.entity';

@Injectable()
export class LapService {
  constructor(
    @Inject('LAP_REPOSITORY')
    private readonly lapRepository: typeof Lap,
  ) {}

  async findAll(townId?: number): Promise<Lap[]> {
    const where = townId ? { townId } : {};
    return this.lapRepository.findAll({
      where,
      include: [{ model: EnumerationArea }],
    });
  }

  async findOne(id: number): Promise<Lap> {
    const lap = await this.lapRepository.findByPk(id, {
      include: [{ model: EnumerationArea }],
    });
    if (!lap) {
      throw new NotFoundException(`LAP with ID ${id} not found`);
    }
    return lap;
  }

  async create(dto: CreateLapDto): Promise<Lap> {
    return this.lapRepository.create({ ...dto });
  }
}
