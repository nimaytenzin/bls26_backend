import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { DzongkhagModule } from '../dzongkhag/dzongkhag.module';
import { TownModule } from '../town/town.module';
import { LapModule } from '../lap/lap.module';
import { EnumerationAreaModule } from '../enumeration-area/enumeration-area.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    DzongkhagModule,
    TownModule,
    LapModule,
    EnumerationAreaModule,
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
