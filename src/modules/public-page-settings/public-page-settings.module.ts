import { Module } from '@nestjs/common';
import { PublicPageSettingsController } from './public-page-settings.controller';
import { PublicPageSettingsService } from './public-page-settings.service';
import { PublicPageSettings } from './entities/public-page-settings.entity';

@Module({
  controllers: [PublicPageSettingsController],
  providers: [
    PublicPageSettingsService,
    {
      provide: 'PUBLIC_PAGE_SETTINGS_REPOSITORY',
      useValue: PublicPageSettings,
    },
  ],
  exports: [PublicPageSettingsService],
})
export class PublicPageSettingsModule {}

