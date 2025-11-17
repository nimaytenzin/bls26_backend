import { databaseConfig } from './database.config';
import { Sequelize } from 'sequelize-typescript';
import {
  DEVELOPMENT,
  PRODUCTION,
  SEQUELIZE,
  TEST,
} from 'src/constants/constants';
import { Dzongkhag } from 'src/modules/location/dzongkhag/entities/dzongkhag.entity';
import { AdministrativeZone } from 'src/modules/location/administrative-zone/entities/administrative-zone.entity';
import { SubAdministrativeZone } from 'src/modules/location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { EnumerationArea } from 'src/modules/location/enumeration-area/entities/enumeration-area.entity';
import { User } from 'src/modules/auth/entities/user.entity';
import { SupervisorDzongkhag } from 'src/modules/auth/entities/supervisor-dzongkhag.entity';
import { Survey } from 'src/modules/survey/survey/entities/survey.entity';
import { SurveyEnumerationAreaHouseholdListing } from 'src/modules/survey/survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { SurveyEnumerator } from 'src/modules/survey/survey-enumerator/entities/survey-enumerator.entity';
import { Building } from 'src/modules/buildings/entities/building.entity';
import { SurveyEnumerationArea } from 'src/modules/survey/survey-enumeration-area/entities/survey-enumeration-area.entity';
import { EAAnnualStats } from 'src/modules/annual statistics/ea-annual-statistics/entities/ea-annual-stats.entity';
import { SAZAnnualStats } from 'src/modules/annual statistics/sub-administrative-zone-annual-statistics/entities/saz-annual-stats.entity';
import { AZAnnualStats } from 'src/modules/annual statistics/administrative-zone-annual-statistics/entities/az-annual-stats.entity';
import { DzongkhagAnnualStats } from 'src/modules/annual statistics/dzongkhag-annual-statistics/entities/dzongkhag-annual-stats.entity';

export const databaseProviders = [
  {
    provide: SEQUELIZE,
    useFactory: async () => {
      let config;

      switch (process.env.NODE_ENV) {
        case DEVELOPMENT:
          config = databaseConfig.development;
          break;
        case TEST:
          config = databaseConfig.test;
          break;
        case PRODUCTION:
          config = databaseConfig.production;
          break;
        default:
          config = databaseConfig.development;
      }
      const sequelize = new Sequelize(config);
      sequelize.addModels([
        User,
        SupervisorDzongkhag,
        Dzongkhag,
        AdministrativeZone,
        SubAdministrativeZone,
        EnumerationArea,

        Survey,
        SurveyEnumerationArea,
        SurveyEnumerationAreaHouseholdListing,
        SurveyEnumerator,
        Building,
        EAAnnualStats,
        SAZAnnualStats,
        AZAnnualStats,
        DzongkhagAnnualStats,
      ]);

      await sequelize.sync();
      return sequelize;
    },
  },
];
