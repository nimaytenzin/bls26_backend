import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateEnumeratorItemDto } from './create-enumerator-item.dto';

export class BulkCreateEnumeratorsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEnumeratorItemDto)
  enumerators: CreateEnumeratorItemDto[];
}
