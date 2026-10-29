import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { User } from '../users/models/user.model';
import { MemberProfile } from '../profiles/models/member-profile.model';
import { newMembershipNumber } from '../users/membership-number';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(MemberProfile) private readonly profileModel: typeof MemberProfile,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Le scope "withPassword" est le seul endroit où le hash est relu.
    const user = await this.userModel.scope('withPassword').findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Identifiants invalides');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Identifiants invalides');

    return this.buildSession(user);
  }

  /** Inscription libre d'un étudiant : toujours créé avec le rôle MEMBER. */
  async register(dto: RegisterDto) {
    const email = dto.email.trim();
    this.assertEmailDomainAllowed(email);
    const existing = await this.userModel.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const user = await this.userModel.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email,
      password: await bcrypt.hash(dto.password, 10),
      role: 'MEMBER',
    });
    await this.profileModel.create({
      address: dto.address?.trim() || 'Non renseignée',
      phone: dto.phone?.trim() || 'Non renseigné',
      membershipNumber: newMembershipNumber(),
      userId: user.id,
    });

    return this.buildSession(user);
  }

  /**
   * Si ALLOWED_EMAIL_DOMAIN est défini (ex : "etu.univ-lyon1.fr" ou "univ.fr,etu.univ.fr"),
   * seules les adresses de ces domaines (et de leurs sous-domaines) peuvent s'inscrire.
   * Vide = inscription libre. Ne concerne que l'inscription : les comptes créés par un bibliothécaire sont libres.
   */
  private assertEmailDomainAllowed(email: string) {
    const allowed = (process.env.ALLOWED_EMAIL_DOMAIN ?? '')
      .split(',')
      .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);
    if (allowed.length === 0) return;

    const domain = email.split('@').pop()?.toLowerCase() ?? '';
    const ok = allowed.some((d) => domain === d || domain.endsWith(`.${d}`));
    if (!ok) {
      throw new BadRequestException(
        `L'inscription est réservée aux adresses ${allowed.map((d) => `@${d}`).join(' ou ')}.`,
      );
    }
  }

  async me(userId: number) {
    const user = await this.userModel.findByPk(userId, { include: [MemberProfile] });
    if (!user) throw new UnauthorizedException('Compte introuvable.');
    return user;
  }

  private async buildSession(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}
