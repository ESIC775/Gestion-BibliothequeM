import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, literal } from 'sequelize';
import { Book } from '../books/models/book.model';
import { Loan } from '../loans/models/loan.model';
import { Reservation } from '../reservations/models/reservation.model';
import { LIBRARY_RULES, addDays } from './circulation.rules';

/**
 * Logique commune prêts / réservations / stock.
 * Invariant : `availableCopies` = exemplaires sur l'étagère, ni prêtés ni mis de côté pour une réservation.
 */
@Injectable()
export class CirculationService {
  constructor(
    @InjectModel(Book) private readonly bookModel: typeof Book,
    @InjectModel(Loan) private readonly loanModel: typeof Loan,
    @InjectModel(Reservation) private readonly reservationModel: typeof Reservation,
  ) {}

  /** Retire un exemplaire de l'étagère s'il en reste (atomique : pas de sur-réservation). */
  async takeCopy(bookId: number): Promise<boolean> {
    const [affected] = await this.bookModel.update(
      { availableCopies: literal('availableCopies - 1') as any },
      { where: { id: bookId, availableCopies: { [Op.gt]: 0 } } },
    );
    return affected > 0;
  }

  /**
   * Un exemplaire redevient libre (retour, annulation, expiration).
   * S'il y a une file d'attente, la plus ancienne réservation le récupère ;
   * sinon il retourne sur l'étagère.
   */
  async releaseCopy(bookId: number): Promise<void> {
    const next = await this.reservationModel.findOne({
      where: { bookId, status: 'PENDING' },
      order: [['reservedAt', 'ASC'], ['id', 'ASC']],
    });
    if (next) {
      await next.update({
        status: 'READY',
        expiresAt: addDays(new Date(), LIBRARY_RULES.HOLD_DAYS),
      });
      return;
    }
    await this.bookModel.update(
      { availableCopies: literal('availableCopies + 1') as any },
      { where: { id: bookId } },
    );
  }

  /** Les réservations prêtes non retirées à temps expirent, l'exemplaire est remis en circulation. */
  async expireStale(): Promise<void> {
    const stale = await this.reservationModel.findAll({
      where: { status: 'READY', expiresAt: { [Op.lt]: new Date() } },
      order: [['expiresAt', 'ASC']],
    });
    for (const reservation of stale) {
      await reservation.update({ status: 'EXPIRED' });
      await this.releaseCopy(reservation.bookId);
    }
  }

  activeLoanCount(userId: number) {
    return this.loanModel.count({ where: { userId, status: 'BORROWED' } });
  }

  async hasOverdueLoan(userId: number) {
    const overdue = await this.loanModel.count({
      where: { userId, status: 'BORROWED', dueDate: { [Op.lt]: new Date() } },
    });
    return overdue > 0;
  }

  activeReservationCount(userId: number) {
    return this.reservationModel.count({
      where: { userId, status: { [Op.in]: ['PENDING', 'READY'] } },
    });
  }
}
