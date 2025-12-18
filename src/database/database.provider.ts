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
import { SurveySamplingConfig } from 'src/modules/sampling/entities/survey-sampling-config.entity';
import { SurveyEnumerationAreaSampling } from 'src/modules/sampling/entities/survey-enumeration-area-sampling.entity';
import { SurveyEnumerationAreaHouseholdSample } from 'src/modules/sampling/entities/survey-enumeration-area-household-sample.entity';
import { SurveyEnumerationAreaStructure } from 'src/modules/survey/survey-enumeration-area-structure/entities/survey-enumeration-area-structure.entity';
import { EnumerationAreaSubAdministrativeZone } from 'src/modules/location/enumeration-area/entities/enumeration-area-sub-administrative-zone.entity';
import { EnumerationAreaLineage } from 'src/modules/location/enumeration-area/entities/enumeration-area-lineage.entity';

export const databaseProviders = [
  {
    provide: SEQUELIZE,
    useFactory: async () => {
      let config;

      let environment: string;
      switch (process.env.NODE_ENV) {
        case DEVELOPMENT:
          config = databaseConfig.development;
          environment = 'DEVELOPMENT';
          break;
        case TEST:
          config = databaseConfig.test;
          environment = 'TEST';
          break;
        case PRODUCTION:
          config = databaseConfig.production;
          environment = 'PRODUCTION';
          break;
        default:
          config = databaseConfig.development;
          environment = 'DEVELOPMENT (default)';
      }

      // Log database configuration (masking sensitive information)
      console.log('========================================');
      console.log('📊 DATABASE CONFIGURATION');
      console.log('========================================');
      console.log(`Environment: ${environment}`);
      console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
      if (config.urlDatabase) {
        console.log(`Connection: Using URL (masked)`);
      } else {
        console.log(`Database: ${config.database || 'not set'}`);
        console.log(`Host: ${config.host || 'not set'}`);
        console.log(`Port: ${config.port || 'not set'}`);
        console.log(`Username: ${config.username || 'not set'}`);
        console.log(`Password: ${config.password ? '***' : 'not set'}`);
      }
      console.log(`Dialect: ${config.dialect || 'not set'}`);
      console.log(`Logging: ${config.logging !== undefined ? config.logging : 'not set'}`);
      console.log('========================================');

      const sequelize = new Sequelize(config);
      sequelize.addModels([
        User,
        SupervisorDzongkhag,
        Dzongkhag,
        AdministrativeZone,
        SubAdministrativeZone,
        EnumerationArea,
        EnumerationAreaSubAdministrativeZone,
        EnumerationAreaLineage,

        Survey,
        SurveyEnumerationArea,
        SurveyEnumerationAreaStructure,
        SurveyEnumerationAreaHouseholdListing,
        SurveyEnumerator,
        Building,
        EAAnnualStats,
        SAZAnnualStats,
        AZAnnualStats,
        DzongkhagAnnualStats,
        SurveySamplingConfig,
        SurveyEnumerationAreaSampling,
        SurveyEnumerationAreaHouseholdSample,
      ]);

      await sequelize.sync();
      return sequelize;
    },
  },
];
