import {
  Column,
  DataType,
  Model,
  Table,
  HasMany,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { SubAdministrativeZone } from '../../sub-administrative-zone/entities/sub-administrative-zone.entity';
import { Survey } from '../../../survey/survey/entities/survey.entity';
import { SurveyEnumerationArea } from 'src/modules/survey/survey-enumeration-area/entities/survey-enumeration-area.entity';
import { EAAnnualStats } from '../../../annual statistics/ea-annual-statistics/entities/ea-annual-stats.entity';
import { EnumerationAreaSubAdministrativeZone } from './enumeration-area-sub-administrative-zone.entity';

@Table({
  timestamps: false,
})
export class EnumerationArea extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  description: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  areaCode: string;

  
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  subAdministrativeZoneId: number;

  @Column({
    type: DataType.GEOMETRY('MULTIPOLYGON', 4326),
    allowNull: true,
  })
  geom: string;



  @BelongsToMany(
    () => SubAdministrativeZone,
    () => EnumerationAreaSubAdministrativeZone,
  )
  subAdministrativeZones: SubAdministrativeZone[];

  @BelongsToMany(() => Survey, () => SurveyEnumerationArea)
  surveys: Survey[];

  @HasMany(() => SurveyEnumerationArea)
  surveyEnumerationAreas: SurveyEnumerationArea[];

  @HasMany(() => EAAnnualStats)
  annualStats: EAAnnualStats[];
}
