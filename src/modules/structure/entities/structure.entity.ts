import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { EnumerationArea } from '../../enumeration-area/entities/enumeration-area.entity';
import { HouseholdListing } from '../../household-listing/entities/household-listing.entity';

@Table({
  timestamps: true,
  tableName: 'Structures',
  indexes: [
    {
      unique: true,
      fields: ['enumerationAreaId', 'structureNumber'],
      name: 'unique_ea_structure_number',
    },
    { fields: ['enumerationAreaId'], name: 'idx_structure_ea' },
  ],
})
export class Structure extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => EnumerationArea)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  enumerationAreaId: number;

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

  @BelongsTo(() => EnumerationArea)
  enumerationArea: EnumerationArea;

  @HasMany(() => HouseholdListing)
  householdListings: HouseholdListing[];
}
