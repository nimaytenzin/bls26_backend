import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { EnumerationArea } from '../../../location/enumeration-area/entities/enumeration-area.entity';

@Table({
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['enumerationAreaId', 'year'],
      name: 'unique_ea_year',
    },
    {
      fields: ['year', 'enumerationAreaId'],
      name: 'idx_ea_annual_stats_year_ea',
    },
    {
      fields: ['enumerationAreaId'],
      name: 'idx_ea_annual_stats_enumeration_area',
    },
  ],
})
export class EAAnnualStats extends Model<EAAnnualStats> {
  @Column({
    type: DataType.INTEGER,
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
    type: DataType.INTEGER,
    allowNull: false,
  })
  year: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  totalHouseholds: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  totalMale: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  totalFemale: number;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  createdAt: Date;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  updatedAt: Date;

  // Association
  @BelongsTo(() => EnumerationArea)
  enumerationArea: EnumerationArea;
}
