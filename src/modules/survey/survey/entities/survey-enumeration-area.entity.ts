import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Survey } from './survey.entity';
import { EnumerationArea } from '../../../location/enumeration-area/entities/enumeration-area.entity';

@Table({
  timestamps: false,
  tableName: 'SurveyEnumerationAreas',
})
export class SurveyEnumerationArea extends Model {
  @ForeignKey(() => Survey)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  surveyId: number;

  @ForeignKey(() => EnumerationArea)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  enumerationAreaId: number;
}
