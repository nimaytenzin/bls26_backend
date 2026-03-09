import { Inject, Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import { Dzongkhag } from '../dzongkhag/entities/dzongkhag.entity';
import { Town } from '../town/entities/town.entity';
import { Lap } from '../lap/entities/lap.entity';
import { EnumerationArea } from '../enumeration-area/entities/enumeration-area.entity';
import { Sequelize } from 'sequelize-typescript';
import { SEQUELIZE } from 'src/constants/constants';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @Inject('DZONGKHAG_REPOSITORY')
    private readonly dzongkhagRepository: typeof Dzongkhag,
    @Inject('TOWN_REPOSITORY')
    private readonly townRepository: typeof Town,
    @Inject('LAP_REPOSITORY')
    private readonly lapRepository: typeof Lap,
    @Inject('ENUMERATION_AREA_REPOSITORY')
    private readonly enumerationAreaRepository: typeof EnumerationArea,
    @Inject(SEQUELIZE)
    private readonly sequelize: Sequelize,
  ) {}

  private zeroPad(code: string | number): string {
    return String(code).trim().padStart(2, '0');
  }

  async seedLocations(): Promise<{ message: string; counts: any }> {
    const csvPath = path.resolve(
      __dirname,
      '../../../../data/locationdata.csv',
    );
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    const records = parse(csvContent, {
      columns: (header: string[]) => header.map((h: string) => h.trim()),
      skip_empty_lines: true,
    });

    const transaction = await this.sequelize.transaction();

    try {
      // Clear existing data in reverse dependency order
      await this.enumerationAreaRepository.destroy({
        where: {},
        transaction,
      });
      await this.lapRepository.destroy({ where: {}, transaction });
      await this.townRepository.destroy({ where: {}, transaction });
      await this.dzongkhagRepository.destroy({ where: {}, transaction });

      const dzongkhagMap = new Map<string, Dzongkhag>();
      const townMap = new Map<string, Town>();
      const lapMap = new Map<string, Lap>();

      let dzongkhagCount = 0;
      let townCount = 0;
      let lapCount = 0;
      let eaCount = 0;

      for (const row of records) {
        const dzongkhagName = row['Dzongkhag']?.trim();
        const dzongkhagCode = this.zeroPad(row['Dzongkhag Code']);
        const townName = row['Town']?.trim();
        const townCode = this.zeroPad(row['Town Code']);
        const lapName = row['LAP']?.trim();
        const lapCode = this.zeroPad(row['Lap Code']);
        const eaName = row['EA CODE']?.trim();
        const eaCode = this.zeroPad(row['EA Code']);

        // Dzongkhag - dedup by name
        const dzongkhagKey = dzongkhagName;
        if (!dzongkhagMap.has(dzongkhagKey)) {
          const [dzongkhag] = await this.dzongkhagRepository.findOrCreate({
            where: { name: dzongkhagName },
            defaults: { name: dzongkhagName, areaCode: dzongkhagCode },
            transaction,
          });
          dzongkhagMap.set(dzongkhagKey, dzongkhag);
          dzongkhagCount++;
        }
        const dzongkhag = dzongkhagMap.get(dzongkhagKey);

        // Town - dedup by (dzongkhagId + name)
        const townKey = `${dzongkhag.id}:${townName}`;
        if (!townMap.has(townKey)) {
          const [town] = await this.townRepository.findOrCreate({
            where: { dzongkhagId: dzongkhag.id, name: townName },
            defaults: {
              name: townName,
              areaCode: townCode,
              dzongkhagId: dzongkhag.id,
            },
            transaction,
          });
          townMap.set(townKey, town);
          townCount++;
        }
        const town = townMap.get(townKey);

        // LAP - dedup by (townId + name)
        const lapKey = `${town.id}:${lapName}`;
        if (!lapMap.has(lapKey)) {
          const [lap] = await this.lapRepository.findOrCreate({
            where: { townId: town.id, name: lapName },
            defaults: {
              name: lapName,
              areaCode: lapCode,
              townId: town.id,
            },
            transaction,
          });
          lapMap.set(lapKey, lap);
          lapCount++;
        }
        const lap = lapMap.get(lapKey);

        // EA - each row is a unique EA
        const fullEaCode = `${dzongkhagCode}${townCode}${lapCode}${eaCode}`;
        await this.enumerationAreaRepository.create(
          {
            name: eaName,
            areaCode: eaCode,
            fullEaCode,
            description: eaName,
            dzongkhagId: dzongkhag.id,
            lapId: lap.id,
          },
          { transaction },
        );
        eaCount++;
      }

      await transaction.commit();

      const counts = {
        dzongkhags: dzongkhagCount,
        towns: townCount,
        laps: lapCount,
        enumerationAreas: eaCount,
      };

      this.logger.log(`Seeding complete: ${JSON.stringify(counts)}`);
      return { message: 'Location data seeded successfully', counts };
    } catch (error) {
      await transaction.rollback();
      this.logger.error('Seeding failed', error);
      throw error;
    }
  }
}
