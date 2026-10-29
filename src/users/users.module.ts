import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './models/user.model';
import { MemberProfile } from '../profiles/models/member-profile.model';
import { Loan } from '../loans/models/loan.model';
import { Book } from '../books/models/book.model';
import { Reservation } from '../reservations/models/reservation.model';
import { CirculationModule } from '../circulation/circulation.module';

@Module({
  imports: [SequelizeModule.forFeature([User, MemberProfile, Loan, Book, Reservation]), CirculationModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
