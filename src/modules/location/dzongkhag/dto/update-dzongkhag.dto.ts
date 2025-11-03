import { PartialType } from '@nestjs/mapped-types';
import { CreateDzongkhagDto } from './create-dzongkhag.dto';

export class UpdateDzongkhagDto extends PartialType(CreateDzongkhagDto) {}
