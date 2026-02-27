import { databaseConfig } from './database.config';
import { Sequelize } from 'sequelize-typescript';
import {
  DEVELOPMENT,
  PRODUCTION,
  SEQUELIZE,
  TEST,
} from 'src/constants/constants';
import { Dzongkhag } from 'src/modules/dzongkhag/entities/dzongkhag.entity';
import { EnumerationArea } from 'src/modules/enumeration-area/entities/enumeration-area.entity';
import { User } from 'src/modules/auth/entities/user.entity';
import { Structure } from 'src/modules/structure/entities/structure.entity';
import { HouseholdListing } from 'src/modules/household-listing/entities/household-listing.entity';

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
        Dzongkhag,
        EnumerationArea,
        Structure,
        HouseholdListing,
      ]);

      await sequelize.sync();
      return sequelize;
    },
  },
];
