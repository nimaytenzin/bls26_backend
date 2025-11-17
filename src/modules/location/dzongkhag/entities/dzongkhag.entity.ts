import {
  Column,
  DataType,
  Model,
  Table,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { AdministrativeZone } from 'src/modules/location/administrative-zone/entities/administrative-zone.entity';
import { User } from 'src/modules/auth/entities/user.entity';
import { SupervisorDzongkhag } from 'src/modules/auth/entities/supervisor-dzongkhag.entity';

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

  @BelongsToMany(() => User, () => SupervisorDzongkhag)
  supervisors: User[];
}
