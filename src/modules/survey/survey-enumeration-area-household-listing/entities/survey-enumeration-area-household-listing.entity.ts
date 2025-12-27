import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
} from 'sequelize-typescript';
import { SurveyEnumerationArea } from '../../survey-enumeration-area/entities/survey-enumeration-area.entity';
import { User } from '../../../auth/entities/user.entity';
import { SurveyEnumerationAreaStructure } from '../../survey-enumeration-area-structure/entities/survey-enumeration-area-structure.entity';

/**
 * Survey Enumeration Area Household Listing
 * Stores household data collected during a survey for a specific enumeration area
 *
 * Relationship: SurveyEnumerationArea (1) -> (Many) SurveyEnumerationAreaHouseholdListing
 */
@Table({
  timestamps: true,
  tableName: 'SurveyEnumerationAreaHouseholdListings',
  indexes: [
    {
      unique: true,
      fields: ['surveyEnumerationAreaId', 'structureId', 'householdSerialNumber'],
      name: 'unique_sea_structure_household_serial',
    },
    {
      fields: ['surveyEnumerationAreaId'],
      name: 'idx_survey_ea',
    },
    {
      fields: ['structureId'],
      name: 'idx_structure_id',
    },
    {
      fields: ['householdIdentification'],
      name: 'idx_household_identification',
    },
  ],
})
export class SurveyEnumerationAreaHouseholdListing extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => SurveyEnumerationArea)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  surveyEnumerationAreaId: number;

  @ForeignKey(() => SurveyEnumerationAreaStructure)
  @Column({
    type: DataType.INTEGER,
    allowNull: true, // Nullable initially for migration, will be made required after migration
  })
  structureId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  householdIdentification: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  householdSerialNumber: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  nameOfHOH: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  totalMale: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  totalFemale: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  phoneNumber: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  remarks: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  submittedBy: number;

  // Relationships
  @BelongsTo(() => SurveyEnumerationArea)
  surveyEnumerationArea: SurveyEnumerationArea;

  @BelongsTo(() => SurveyEnumerationAreaStructure)
  structure: SurveyEnumerationAreaStructure;

  @BelongsTo(() => User)
  submitter: User;
}
