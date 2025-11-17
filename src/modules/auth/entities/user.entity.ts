import {
  Column,
  DataType,
  Model,
  Table,
  BelongsToMany,
} from 'sequelize-typescript';
import { Dzongkhag } from 'src/modules/location/dzongkhag/entities/dzongkhag.entity';
import { SupervisorDzongkhag } from './supervisor-dzongkhag.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  ENUMERATOR = 'ENUMERATOR',
}

@Table
export class User extends Model {
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
    unique: true,
  })
  cid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  emailAddress: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  phoneNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password: string;

  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    allowNull: false,
    defaultValue: UserRole.ENUMERATOR,
  })
  role: UserRole;

  @BelongsToMany(() => Dzongkhag, () => SupervisorDzongkhag)
  dzongkhags: Dzongkhag[];
}
