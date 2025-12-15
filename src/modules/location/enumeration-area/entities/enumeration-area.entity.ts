import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { SubAdministrativeZone } from '../../sub-administrative-zone/entities/sub-administrative-zone.entity';
import { Survey } from '../../../survey/survey/entities/survey.entity';
import { SurveyEnumerationArea } from 'src/modules/survey/survey-enumeration-area/entities/survey-enumeration-area.entity';
import { EAAnnualStats } from '../../../annual statistics/ea-annual-statistics/entities/ea-annual-stats.entity';

@Table({
  timestamps: false,
})
export class EnumerationArea extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => SubAdministrativeZone)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  subAdministrativeZoneId: number;

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
    type: DataType.DOUBLE,
    allowNull: true,
  })
  areaSqKm: number;

  @Column({
    type: DataType.GEOMETRY('MULTIPOLYGON', 4326),
    allowNull: true,
  })
  geom: string;

  @BelongsTo(() => SubAdministrativeZone)
  subAdministrativeZone: SubAdministrativeZone;

  @BelongsToMany(() => Survey, () => SurveyEnumerationArea)
  surveys: Survey[];

  @HasMany(() => SurveyEnumerationArea)
  surveyEnumerationAreas: SurveyEnumerationArea[];

  @HasMany(() => EAAnnualStats)
  annualStats: EAAnnualStats[];
}
