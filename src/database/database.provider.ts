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
import { CurrentHouseholdListing } from 'src/modules/household-listings/current-household-listing/entities/current-household-listing.entity';
import { Survey } from 'src/modules/survey/survey/entities/survey.entity';
import { SurveyEnumerationArea } from 'src/modules/survey/survey/entities/survey-enumeration-area.entity';
import { Building } from 'src/modules/buildings/entities/building.entity';
import { HistoricalHouseholdListing } from 'src/modules/household-listings/historical-household-listing/entities/historical-household-listing.entity';

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
        Dzongkhag,
        AdministrativeZone,
        SubAdministrativeZone,
        EnumerationArea,
        CurrentHouseholdListing,
        HistoricalHouseholdListing,
        Survey,
        SurveyEnumerationArea,

        Building,
      ]);

      await sequelize.sync();
      return sequelize;
    },
  },
];
