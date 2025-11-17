import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { Survey } from '../../../survey/survey/entities/survey.entity';
import { EnumerationArea } from '../../../location/enumeration-area/entities/enumeration-area.entity';
import { User } from '../../../auth/entities/user.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../../survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';

/**
 * SurveyEnumerationArea Junction Table
 * Manages the many-to-many relationship between Surveys and EnumerationAreas
 * with workflow tracking (submission and validation)
 *
 * Workflow:
 * 1. Supervisor submits data for an enumeration area (isSubmitted = true, submittedBy = supervisor)
 * 2. Admin validates the submission (isValidated = true, validatedBy = admin)
 */
@Table({
  timestamps: true,
  tableName: 'SurveyEnumerationAreas',
  indexes: [
    {
      unique: true,
      fields: ['surveyId', 'enumerationAreaId'],
      name: 'unique_survey_ea',
    },
    {
      fields: ['surveyId'],
      name: 'idx_survey',
    },
    {
      fields: ['enumerationAreaId'],
      name: 'idx_enumeration_area',
    },
    {
      fields: ['isSubmitted', 'isValidated'],
      name: 'idx_workflow_status',
    },
    {
      fields: ['submittedBy'],
      name: 'idx_submitted_by',
    },
    {
      fields: ['validatedBy'],
      name: 'idx_validated_by',
    },
  ],
})
export class SurveyEnumerationArea extends Model {
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

  @ForeignKey(() => EnumerationArea)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  enumerationAreaId: number;

  // Submission Workflow Fields
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isSubmitted: boolean;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  submittedBy: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  submissionDate: Date;

  // Validation Workflow Fields
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isValidated: boolean;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  validatedBy: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  validationDate: Date;

  // Optional: Rejection/Comments
  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  comments: string;

  // Relationships
  @BelongsTo(() => Survey)
  survey: Survey;

  @BelongsTo(() => EnumerationArea)
  enumerationArea: EnumerationArea;

  @BelongsTo(() => User, 'submittedBy')
  submitter: User;

  @BelongsTo(() => User, 'validatedBy')
  validator: User;

  @HasMany(() => SurveyEnumerationAreaHouseholdListing)
  householdListings: SurveyEnumerationAreaHouseholdListing[];
}
