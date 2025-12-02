import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { SurveyEnumerationArea } from '../../survey-enumeration-area/entities/survey-enumeration-area.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../../survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';

/**
 * Survey Enumeration Area Structure
 * Represents a physical structure within a survey enumeration area
 * 
 * Relationship: 
 * - SurveyEnumerationArea (1) -> (Many) SurveyEnumerationAreaStructure
 * - SurveyEnumerationAreaStructure (1) -> (Many) SurveyEnumerationAreaHouseholdListing
 */
@Table({
  timestamps: true,
  tableName: 'SurveyEnumerationAreaStructures',
  indexes: [
    {
      unique: true,
      fields: ['surveyEnumerationAreaId', 'structureNumber'],
      name: 'unique_sea_structure_number',
    },
    {
      fields: ['surveyEnumerationAreaId'],
      name: 'idx_survey_ea_structure',
    },
    {
      fields: ['structureNumber'],
      name: 'idx_structure_number',
    },
  ],
})
export class SurveyEnumerationAreaStructure extends Model {
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

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  structureNumber: string;

  @Column({
    type: DataType.DECIMAL(10, 8),
    allowNull: true,
  })
  latitude: number;

  @Column({
    type: DataType.DECIMAL(11, 8),
    allowNull: true,
  })
  longitude: number;

  // Relationships
  @BelongsTo(() => SurveyEnumerationArea)
  surveyEnumerationArea: SurveyEnumerationArea;

  @HasMany(() => SurveyEnumerationAreaHouseholdListing)
  householdListings: SurveyEnumerationAreaHouseholdListing[];
}

