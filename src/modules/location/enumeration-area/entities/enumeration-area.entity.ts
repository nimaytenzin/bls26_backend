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
import { EnumerationAreaLineage } from './enumeration-area-lineage.entity';

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

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  isActive: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  deactivatedAt: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  deactivatedReason: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isRBA: boolean;

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

  @HasMany(() => EnumerationAreaLineage, 'parentEaId')
  parentLineages: EnumerationAreaLineage[];

  @HasMany(() => EnumerationAreaLineage, 'childEaId')
  childLineages: EnumerationAreaLineage[];
}
