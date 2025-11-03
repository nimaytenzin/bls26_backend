import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { AdministrativeZone } from '../../administrative-zone/entities/administrative-zone.entity';
import { EnumerationArea } from '../../enumeration-area/entities/enumeration-area.entity';

export enum SubAdministrativeZoneType {
  CHIWOG = 'chiwog',
  LAP = 'lap',
}

@Table({
  timestamps: false,
})
export class SubAdministrativeZone extends Model {
  @Column({
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
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.ENUM(...Object.values(SubAdministrativeZoneType)),
    allowNull: false,
  })
  type: SubAdministrativeZoneType;

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

  @BelongsTo(() => AdministrativeZone)
  administrativeZone: AdministrativeZone;

  @HasMany(() => EnumerationArea)
  enumerationAreas: EnumerationArea[];
}
