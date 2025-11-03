import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { EnumerationArea } from '../../../location/enumeration-area/entities/enumeration-area.entity';

@Table({
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['enumerationAreaId', 'year'],
      name: 'unique_enumeration_area_year',
    },
  ],
})
export class HistoricalHouseholdListing extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  year: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  householdCount: number;

  @ForeignKey(() => EnumerationArea)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  enumerationAreaId: number;

  @BelongsTo(() => EnumerationArea)
  enumerationArea: EnumerationArea;
}
