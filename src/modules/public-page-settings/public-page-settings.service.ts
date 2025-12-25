import { Inject, Injectable } from '@nestjs/common';
import { PublicPageSettings } from './entities/public-page-settings.entity';
import {
  MapVisualizationMode,
  ColorScaleType,
} from './entities/public-page-settings.entity';
import { UpdatePublicPageSettingsDto } from './dto/update-public-page-settings.dto';
import { PublicPageSettingsDto } from './dto/public-page-settings.dto';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class PublicPageSettingsService {
  private readonly DEFAULT_SETTINGS = {
    mapVisualizationMode: MapVisualizationMode.HOUSEHOLDS,
    selectedBasemapId: 'positron',
    colorScale: ColorScaleType.BLUE,
    nationalDataViewerTitle: 'National Sampling Frame',
    nationalDataViewerDescription:
      'Current statistics on households and enumeration areas',
    nationalDataViewerInfoBoxContent:
      'A sampling frame is a population from which a sample can be drawn, ensuring survey samples are representative and reliable.',
    nationalDataViewerInfoBoxStats:
      '3,310 EAs total (1,464 urban, 1,846 rural)',
  };

  private readonly SINGLETON_ID = 1;

  constructor(
    @Inject('PUBLIC_PAGE_SETTINGS_REPOSITORY')
    private readonly settingsRepository: typeof PublicPageSettings,
  ) {}

  /**
   * Get public page settings (singleton pattern - always id=1)
   * Creates default settings if none exist
   */
  async getSettings(): Promise<PublicPageSettingsDto> {
    let settings = await this.settingsRepository.findOne<PublicPageSettings>({
      where: { id: this.SINGLETON_ID },
    });

    if (!settings) {
      // Create default settings if none exist
      settings = await this.settingsRepository.create<PublicPageSettings>({
        id: this.SINGLETON_ID,
        ...this.DEFAULT_SETTINGS,
      } as any);
    }

    return this.toDto(settings);
  }

  /**
   * Update public page settings
   * Creates settings if they don't exist
   * @param updateDto - Partial settings to update
   * @param userId - ID of user making the update
   */
  async updateSettings(
    updateDto: UpdatePublicPageSettingsDto,
    userId: number,
  ): Promise<PublicPageSettingsDto> {
    let settings = await this.settingsRepository.findOne<PublicPageSettings>({
      where: { id: this.SINGLETON_ID },
    });

    if (!settings) {
      // Create with defaults and updates merged
      settings = await this.settingsRepository.create<PublicPageSettings>({
        id: this.SINGLETON_ID,
        ...this.DEFAULT_SETTINGS,
        ...instanceToPlain(updateDto),
        createdBy: userId,
        updatedBy: userId,
      } as any);
    } else {
      // Update existing settings
      const updateData: any = {
        ...instanceToPlain(updateDto),
        updatedBy: userId,
      };
      await this.settingsRepository.update(updateData, {
        where: { id: this.SINGLETON_ID },
      });
      settings = await this.settingsRepository.findOne<PublicPageSettings>({
        where: { id: this.SINGLETON_ID },
      });
    }

    return this.toDto(settings);
  }

  /**
   * Reset settings to default values
   * @param userId - ID of user performing the reset
   */
  async resetToDefaults(userId: number): Promise<PublicPageSettingsDto> {
    let settings = await this.settingsRepository.findOne<PublicPageSettings>({
      where: { id: this.SINGLETON_ID },
    });

    if (settings) {
      // Update existing settings to defaults
      await this.settingsRepository.update(
        {
          ...this.DEFAULT_SETTINGS,
          updatedBy: userId,
        },
        {
          where: { id: this.SINGLETON_ID },
        },
      );
      settings = await this.settingsRepository.findOne<PublicPageSettings>({
        where: { id: this.SINGLETON_ID },
      });
    } else {
      // Create with defaults
      settings = await this.settingsRepository.create<PublicPageSettings>({
        id: this.SINGLETON_ID,
        ...this.DEFAULT_SETTINGS,
        createdBy: userId,
        updatedBy: userId,
      } as any);
    }

    return this.toDto(settings);
  }

  /**
   * Convert entity to DTO
   */
  private toDto(entity: PublicPageSettings): PublicPageSettingsDto {
    return {
      id: entity.id,
      mapVisualizationMode: entity.mapVisualizationMode as
        | 'households'
        | 'enumerationAreas',
      selectedBasemapId: entity.selectedBasemapId,
      colorScale: entity.colorScale as string,
      nationalDataViewerTitle: entity.nationalDataViewerTitle,
      nationalDataViewerDescription: entity.nationalDataViewerDescription,
      nationalDataViewerInfoBoxContent: entity.nationalDataViewerInfoBoxContent,
      nationalDataViewerInfoBoxStats: entity.nationalDataViewerInfoBoxStats,
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

