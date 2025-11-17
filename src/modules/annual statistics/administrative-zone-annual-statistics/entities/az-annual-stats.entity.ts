import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { AdministrativeZone } from '../../../location/administrative-zone/entities/administrative-zone.entity';

@Table({
  tableName: 'AdministrativeZoneAnnualStats',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['administrativeZoneId', 'year'],
      name: 'unique_az_year',
    },
    {
      fields: ['year', 'administrativeZoneId'],
      name: 'idx_year_az',
    },
    {
      fields: ['administrativeZoneId'],
      name: 'idx_az',
    },
  ],
})
export class AZAnnualStats extends Model<AZAnnualStats> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => AdministrativeZone)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  administrativeZoneId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  year: number;

  // EA: Enumeration Area
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  eaCount: number;

  // SAZ: Sub-Administrative Zone
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  sazCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  totalHouseholds: number;

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

  @BelongsTo(() => AdministrativeZone)
  administrativeZone: AdministrativeZone;
}
