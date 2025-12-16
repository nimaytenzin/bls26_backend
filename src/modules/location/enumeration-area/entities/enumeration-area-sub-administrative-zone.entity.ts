import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  PrimaryKey,
  Index,
} from 'sequelize-typescript';
import { EnumerationArea } from './enumeration-area.entity';
import { SubAdministrativeZone } from '../../sub-administrative-zone/entities/sub-administrative-zone.entity';

/**
 * Junction Table: EnumerationAreaSubAdministrativeZones
 * 
 * Supports many-to-many relationship between Enumeration Areas and Sub-Administrative Zones.
 * This is the only method for EA-SAZ relationships.
 */
@Table({
  timestamps: false,
  tableName: 'EnumerationAreaSubAdministrativeZones',
  indexes: [
    {
      unique: true,
      fields: ['enumerationAreaId', 'subAdministrativeZoneId'],
      name: 'unique_ea_saz_junction',
    },
    {
      fields: ['enumerationAreaId'],
      name: 'idx_ea_saz_junction_enumeration_area',
    },
    {
      fields: ['subAdministrativeZoneId'],
      name: 'idx_ea_saz_junction_sub_admin_zone',
    },
  ],
})
export class EnumerationAreaSubAdministrativeZone extends Model {
  @PrimaryKey
  @ForeignKey(() => EnumerationArea)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  enumerationAreaId: number;

  @PrimaryKey
  @ForeignKey(() => SubAdministrativeZone)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  subAdministrativeZoneId: number;
}

