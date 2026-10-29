import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Book } from '../books/models/book.model';
import { Loan } from '../loans/models/loan.model';
import { Reservation } from '../reservations/models/reservation.model';
import { CirculationService } from './circulation.service';

@Module({
  imports: [SequelizeModule.forFeature([Book, Loan, Reservation])],
  providers: [CirculationService],
  exports: [CirculationService],
})
export class CirculationModule {}
