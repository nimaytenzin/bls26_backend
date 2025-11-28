import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Survey } from 'src/modules/survey/survey/entities/survey.entity';
import { User } from 'src/modules/auth/entities/user.entity';

export enum SamplingMethod {
  CSS = 'CSS',
  SRS = 'SRS',
}

@Table({
  tableName: 'SurveySamplingConfigs',
  timestamps: true,
})
export class SurveySamplingConfig extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => Survey)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    unique: true,
  })
  surveyId: number;

  @Column({
    type: DataType.ENUM(...Object.values(SamplingMethod)),
    allowNull: false,
    defaultValue: SamplingMethod.CSS,
  })
  defaultMethod: SamplingMethod;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  defaultSampleSize: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  urbanSampleSize: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  ruralSampleSize: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  createdBy: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  updatedBy: number;

  @BelongsTo(() => Survey)
  survey: Survey;

  @BelongsTo(() => User, 'createdBy')
  creator: User;

  @BelongsTo(() => User, 'updatedBy')
  updater: User;
}

