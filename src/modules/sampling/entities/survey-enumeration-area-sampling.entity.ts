import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { Survey } from 'src/modules/survey/survey/entities/survey.entity';
import { SurveyEnumerationArea } from 'src/modules/survey/survey-enumeration-area/entities/survey-enumeration-area.entity';
import { User } from 'src/modules/auth/entities/user.entity';
import { SurveyEnumerationAreaHouseholdSample } from './survey-enumeration-area-household-sample.entity';
import { SamplingMethod } from './survey-sampling-config.entity';

@Table({
  tableName: 'SurveyEnumerationAreaSamplings',
  timestamps: true,
  indexes: [
    {
      fields: ['surveyId'],
      name: 'idx_sampling_survey',
    },
    {
      fields: ['surveyEnumerationAreaId'],
      name: 'idx_sampling_sea',
    },
  ],
})
export class SurveyEnumerationAreaSampling extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => Survey)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  surveyId: number;

  @ForeignKey(() => SurveyEnumerationArea)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  surveyEnumerationAreaId: number;

  @Column({
    type: DataType.ENUM(...Object.values(SamplingMethod)),
    allowNull: false,
  })
  method: SamplingMethod;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  sampleSize: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  populationSize: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  samplingInterval: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  randomStart: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  wrapAroundCount: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isFullSelection: boolean;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: [],
  })
  selectedIndices: number[];

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata: Record<string, any>;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  executedBy: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  executedAt: Date;

  @BelongsTo(() => Survey)
  survey: Survey;

  @BelongsTo(() => SurveyEnumerationArea)
  surveyEnumerationArea: SurveyEnumerationArea;

  @BelongsTo(() => User)
  executor: User;

  @HasMany(() => SurveyEnumerationAreaHouseholdSample)
  samples: SurveyEnumerationAreaHouseholdSample[];
}

