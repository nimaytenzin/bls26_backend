import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { SurveyEnumerationAreaSampling } from './survey-enumeration-area-sampling.entity';
import { SurveyEnumerationAreaHouseholdListing } from 'src/modules/survey/survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';

@Table({
  tableName: 'SurveyEnumerationAreaHouseholdSamples',
  timestamps: true,
  indexes: [
    {
      fields: ['surveyEnumerationAreaSamplingId'],
      name: 'idx_household_samples_sampling',
    },
  ],
})
export class SurveyEnumerationAreaHouseholdSample extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => SurveyEnumerationAreaSampling)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  surveyEnumerationAreaSamplingId: number;

  @ForeignKey(() => SurveyEnumerationAreaHouseholdListing)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  householdListingId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  selectionOrder: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isReplacement: boolean;

  @BelongsTo(() => SurveyEnumerationAreaSampling)
  sampling: SurveyEnumerationAreaSampling;

  @BelongsTo(() => SurveyEnumerationAreaHouseholdListing)
  householdListing: SurveyEnumerationAreaHouseholdListing;
}

