import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateStructureDto } from './create-structure.dto';

export class BulkCreateStructureDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStructureDto)
  structures: CreateStructureDto[];
}
