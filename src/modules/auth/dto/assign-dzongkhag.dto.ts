import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

export class AssignDzongkhagDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  dzongkhagIds: number[];
}
