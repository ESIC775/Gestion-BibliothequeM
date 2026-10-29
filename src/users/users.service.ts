import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './models/user.model';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MemberProfile } from '../profiles/models/member-profile.model';
import { Loan } from '../loans/models/loan.model';
import { Book } from '../books/models/book.model';
import { Reservation } from '../reservations/models/reservation.model';
import { CirculationService } from '../circulation/circulation.service';
import { newMembershipNumber } from './membership-number';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(MemberProfile) private readonly profileModel: typeof MemberProfile,
    @InjectModel(Loan) private readonly loanModel: typeof Loan,
    @InjectModel(Reservation) private readonly reservationModel: typeof Reservation,
    private readonly circulation: CirculationService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const user = await this.userModel.create({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: createUserDto.email,
      password: createUserDto.password || '$2b$10$61EQfLnhq9TYPcM14CI9j.qX0x4t24QPu1ekwat6Og..xT.nDaI1G', // 'mohamed123' par défaut
    });

    const membershipNumber = `MEM-2026-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    await this.profileModel.create({
      address: createUserDto.address,
      phone: createUserDto.phone,
      membershipNumber,
      userId: user.id,
    });

    return this.findOne(user.id);
  }

  findAll() {
    return this.userModel.findAll({
      include: [
        { model: MemberProfile },
        { model: Loan, include: [Book] },
      ],
      order: [['id', 'ASC']],
    });
  }

  async findOne(id: number) {
    const user = await this.userModel.findByPk(id, {
      include: [
        { model: MemberProfile },
        { model: Loan, include: [Book] },
      ],
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur ${id} introuvable.`);
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    
    await user.update({
      firstName: updateUserDto.firstName ?? user.firstName,
      lastName: updateUserDto.lastName ?? user.lastName,
      email: updateUserDto.email ?? user.email,
      role: updateUserDto.role ?? user.role,
      ...(updateUserDto.password
        ? { password: await bcrypt.hash(updateUserDto.password, 10) }
        : {}),
    });

    if (updateUserDto.address || updateUserDto.phone) {
      if (user.profile) {
        await user.profile.update({
          address: updateUserDto.address ?? user.profile.address,
          phone: updateUserDto.phone ?? user.profile.phone,
        });
      } else {
        await this.profileModel.create({
          address: updateUserDto.address ?? 'À renseigner',
          phone: updateUserDto.phone ?? 'À renseigner',
          membershipNumber: newMembershipNumber(),
          userId: user.id,
        });
      }
    }

    return this.findOne(id);
  }

  async remove(id: number, currentUserId?: number) {
    const user = await this.findOne(id);

    if (currentUserId === id) {
      throw new ConflictException('Vous ne pouvez pas supprimer votre propre compte.');
    }
    const activeLoans = await this.loanModel.count({ where: { userId: id, status: 'BORROWED' } });
    if (activeLoans > 0) {
      throw new ConflictException(
        `Impossible de supprimer : ce membre a encore ${activeLoans} livre(s) à rendre.`,
      );
    }
    // Les réservations en cours sont annulées proprement (exemplaires remis en circulation).
    const holds = await this.reservationModel.findAll({
      where: { userId: id, status: { [Op.in]: ['PENDING', 'READY'] } },
    });
    for (const hold of holds) {
      const wasReady = hold.status === 'READY';
      await hold.update({ status: 'CANCELLED' });
      if (wasReady) await this.circulation.releaseCopy(hold.bookId);
    }

    // Plus de prêt ni de réservation active : on supprime l'historique et le profil, puis le compte,
    // dans une seule transaction (tout ou rien).
    await this.userModel.sequelize!.transaction(async (transaction) => {
      await this.loanModel.destroy({ where: { userId: id }, transaction });
      await this.reservationModel.destroy({ where: { userId: id }, transaction });
      await this.profileModel.destroy({ where: { userId: id }, transaction });
      await user.destroy({ transaction });
    });
    return { message: `Utilisateur ${id} supprimé avec succès.` };
  }
}
