import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { User } from 'src/modules/auth/entities/user.entity';
import { Survey } from '../../survey/entities/survey.entity';

@Table({
  tableName: 'survey_enumerators',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'surveyId'],
      name: 'survey_enumerators_user_survey_unique',
    },
  ],
})
export class SurveyEnumerator extends Model<SurveyEnumerator> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey: true, // Part of composite primary key
  })
  userId: number;

  @ForeignKey(() => Survey)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey: true, // Part of composite primary key
  })
  surveyId: number;

  // Relationships
  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Survey)
  survey: Survey;
}
