import {
  Table,
  Model,
  Column,
  DataType,
  HasOne,
  HasMany,
} from 'sequelize-typescript';
import { ApiProperty } from '@nestjs/swagger';
import { MemberProfile } from '../../profiles/models/member-profile.model';
import { Loan } from '../../loans/models/loan.model';
import { Reservation } from '../../reservations/models/reservation.model';

@Table({
  tableName: 'users',
  // Le hash du mot de passe n'est jamais renvoyé par l'API (sauf scope "withPassword" pour le login).
  defaultScope: { attributes: { exclude: ['password'] } },
  scopes: { withPassword: {} },
})
export class User extends Model {
  @ApiProperty()
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @ApiProperty()
  @Column({ type: DataType.STRING(100), allowNull: false })
  declare firstName: string;

  @ApiProperty()
  @Column({ type: DataType.STRING(100), allowNull: false })
  declare lastName: string;

  @ApiProperty()
  @Column({ type: DataType.STRING(150), allowNull: false, unique: true })
  declare email: string;

  @ApiProperty()
  @Column({ type: DataType.STRING, allowNull: false })
  declare password: string;

  @ApiProperty({ example: 'MEMBER', enum: ['ADMIN', 'MEMBER'], description: 'ADMIN = bibliothécaire, MEMBER = adhérent' })
  @Column({
    type: DataType.STRING(10),
    allowNull: false,
    defaultValue: 'MEMBER',
    validate: { isIn: [['ADMIN', 'MEMBER']] },
  })
  declare role: 'ADMIN' | 'MEMBER';

  @ApiProperty({ type: () => MemberProfile })
  @HasOne(() => MemberProfile)
  declare profile: MemberProfile;

  @ApiProperty({ type: () => [Loan] })
  @HasMany(() => Loan)
  declare loans: Loan[];

  @ApiProperty({ type: () => [Reservation] })
  @HasMany(() => Reservation)
  declare reservations: Reservation[];
}
