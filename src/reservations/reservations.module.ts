import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Reservation } from './models/reservation.model';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { Book } from '../books/models/book.model';
import { User } from '../users/models/user.model';
import { Loan } from '../loans/models/loan.model';
import { CirculationModule } from '../circulation/circulation.module';

@Module({
  imports: [SequelizeModule.forFeature([Reservation, Book, User, Loan]), CirculationModule],
  providers: [ReservationsService],
  controllers: [ReservationsController],
  exports: [ReservationsService],
})
export class ReservationsModule {}
