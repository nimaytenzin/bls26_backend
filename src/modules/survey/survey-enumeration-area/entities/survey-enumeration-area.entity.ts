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
import { SurveyEnumerationAreaStructure } from '../../survey-enumeration-area-structure/entities/survey-enumeration-area-structure.entity';

/**
 * SurveyEnumerationArea Junction Table
 * Manages the many-to-many relationship between Surveys and EnumerationAreas
 * with workflow tracking (enumeration, sampling, and publishing)
 *
 * Workflow:
 * 1. Enumerator completes enumeration (isEnumerated = true, enumeratedBy = enumerator)
 * 2. Supervisor performs sampling (isSampled = true, sampledBy = supervisor)
 * 3. Admin publishes data (isPublished = true, publishedBy = admin)
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
      fields: ['isEnumerated', 'isSampled', 'isPublished'],
      name: 'idx_workflow_status',
    },
    {
      fields: ['enumeratedBy'],
      name: 'idx_enumerated_by',
    },
    {
      fields: ['sampledBy'],
      name: 'idx_sampled_by',
    },
    {
      fields: ['publishedBy'],
      name: 'idx_published_by',
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

  // Enumeration Workflow Fields (renamed from submission)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isEnumerated: boolean;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  enumeratedBy: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  enumerationDate: Date;

  // Sampling Workflow Fields
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isSampled: boolean;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  sampledBy: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  sampledDate: Date;

  // Publishing Workflow Fields
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isPublished: boolean;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  publishedBy: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  publishedDate: Date;

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

  @BelongsTo(() => User, 'enumeratedBy')
  enumerator: User;

  @BelongsTo(() => User, 'sampledBy')
  sampler: User;

  @BelongsTo(() => User, 'publishedBy')
  publisher: User;

  @HasMany(() => SurveyEnumerationAreaStructure)
  structures: SurveyEnumerationAreaStructure[];

  @HasMany(() => SurveyEnumerationAreaHouseholdListing)
  householdListings: SurveyEnumerationAreaHouseholdListing[];
}
