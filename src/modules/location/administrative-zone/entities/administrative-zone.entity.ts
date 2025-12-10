import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { Dzongkhag } from '../../dzongkhag/entities/dzongkhag.entity';
import { SubAdministrativeZone } from 'src/modules/location/sub-administrative-zone/entities/sub-administrative-zone.entity';

export enum AdministrativeZoneType {
  GEWOG = 'Gewog',
  THROMDE = 'Thromde',
}

@Table({
  timestamps: false,
})
export class AdministrativeZone extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => Dzongkhag)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  dzongkhagId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  areaCode: string;

  @Column({
    type: DataType.ENUM(...Object.values(AdministrativeZoneType)),
    allowNull: false,
  })
  type: AdministrativeZoneType;

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

  @BelongsTo(() => Dzongkhag)
  dzongkhag: Dzongkhag;

  @HasMany(() => SubAdministrativeZone)
  subAdministrativeZones: SubAdministrativeZone[];
}
