import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { User } from './user.entity';
import { Dzongkhag } from 'src/modules/location/dzongkhag/entities/dzongkhag.entity';

@Table
export class SupervisorDzongkhag extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  supervisorId: number;

  @ForeignKey(() => Dzongkhag)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  dzongkhagId: number;

  @BelongsTo(() => User)
  supervisor: User;

  @BelongsTo(() => Dzongkhag)
  dzongkhag: Dzongkhag;
}
