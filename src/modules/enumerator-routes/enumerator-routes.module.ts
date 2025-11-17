import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { EnumeratorRoutesController } from './enumerator-routes.controller';
import { enumeratorRoutesProviders } from './enumerator-routes.provider';
import { EnumeratorRoutesService } from './enumerator-routes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [EnumeratorRoutesController],
  providers: [EnumeratorRoutesService, ...enumeratorRoutesProviders],
  exports: [EnumeratorRoutesService],
})
export class EnumeratorRoutesModule {}
