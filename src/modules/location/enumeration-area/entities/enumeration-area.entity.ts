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
import { CurrentHouseholdListing } from '../../../household-listings/current-household-listing/entities/current-household-listing.entity';
import { Survey } from '../../../survey/survey/entities/survey.entity';
import { SurveyEnumerationArea } from '../../../survey/survey/entities/survey-enumeration-area.entity';

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
    allowNull: false,
  })
  areaSqKm: number;

  @Column({
    type: DataType.GEOMETRY('MULTIPOLYGON', 4326),
    allowNull: true,
  })
  geom: string;

  @BelongsTo(() => SubAdministrativeZone)
  subAdministrativeZone: SubAdministrativeZone;

  @HasMany(() => CurrentHouseholdListing)
  currentHouseholdListings: CurrentHouseholdListing[];

  @BelongsToMany(() => Survey, () => SurveyEnumerationArea)
  surveys: Survey[];
}
