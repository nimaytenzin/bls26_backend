import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { SubAdministrativeZone } from '../../../location/sub-administrative-zone/entities/sub-administrative-zone.entity';

@Table({
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['subAdministrativeZoneId', 'year'],
      name: 'unique_saz_year',
    },
    {
      fields: ['year', 'subAdministrativeZoneId'],
      name: 'idx_year_saz',
    },
    {
      fields: ['subAdministrativeZoneId'],
      name: 'idx_saz',
    },
  ],
})
export class SAZAnnualStats extends Model<SAZAnnualStats> {
  @Column({
    type: DataType.INTEGER,
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
    type: DataType.INTEGER,
    allowNull: false,
  })
  year: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  eaCount: number;

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

  @BelongsTo(() => SubAdministrativeZone)
  subAdministrativeZone: SubAdministrativeZone;
}
