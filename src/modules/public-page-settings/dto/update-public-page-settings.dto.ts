import {
  IsOptional,
  IsString,
  IsIn,
  MaxLength,
} from 'class-validator';

export class UpdatePublicPageSettingsDto {
  @IsOptional()
  @IsIn(['households', 'enumerationAreas'])
  mapVisualizationMode?: 'households' | 'enumerationAreas';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  selectedBasemapId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['blue', 'green', 'red', 'purple', 'orange', 'gray', 'yellow', 'viridis', 'plasma'])
  colorScale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nationalDataViewerTitle?: string;

  @IsOptional()
  @IsString()
  nationalDataViewerDescription?: string;

  @IsOptional()
  @IsString()
  nationalDataViewerInfoBoxContent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nationalDataViewerInfoBoxStats?: string;
}

