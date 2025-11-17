import {
  Column,
  DataType,
  Model,
  Table,
  BelongsToMany,
  HasMany,
} from 'sequelize-typescript';
import { EnumerationArea } from '../../../location/enumeration-area/entities/enumeration-area.entity';
import { SurveyEnumerationArea } from '../../survey-enumeration-area/entities/survey-enumeration-area.entity';

export enum SurveyStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

@Table({
  timestamps: true,
  tableName: 'Surveys',
})
export class Survey extends Model {
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
    type: DataType.TEXT,
    allowNull: false,
  })
  description: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  startDate: Date;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  endDate: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  year: number;

  @Column({
    type: DataType.ENUM('ACTIVE', 'ENDED'),
    allowNull: false,
    defaultValue: 'ACTIVE',
  })
  status: SurveyStatus;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isFullyValidated: boolean;

  // Relationships
  @BelongsToMany(() => EnumerationArea, () => SurveyEnumerationArea)
  enumerationAreas: EnumerationArea[];

  @HasMany(() => SurveyEnumerationArea)
  surveyEnumerationAreas: SurveyEnumerationArea[];
}
