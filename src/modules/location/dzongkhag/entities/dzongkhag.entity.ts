import { Column, DataType, Model, Table, HasMany } from 'sequelize-typescript';
import { AdministrativeZone } from 'src/modules/location/administrative-zone/entities/administrative-zone.entity';

@Table({
  timestamps: false,
})
export class Dzongkhag extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

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
    type: DataType.DOUBLE,
    allowNull: false,
  })
  areaSqKm: number;

  @Column({
    type: DataType.GEOMETRY('MULTIPOLYGON', 4326),
    allowNull: true,
  })
  geom: string;

  @HasMany(() => AdministrativeZone)
  administrativeZones: AdministrativeZone[];
}
