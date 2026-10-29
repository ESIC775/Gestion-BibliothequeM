import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectModel } from '@nestjs/sequelize';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../users/models/user.model';
import { AuthUser } from '../auth.decorators';

export const JWT_SECRET = process.env.JWT_SECRET ?? 'secret_key_2026';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectModel(User) private readonly userModel: typeof User) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  /** Relit l'utilisateur en base : un compte supprimé ou rétrogradé perd l'accès tout de suite. */
  async validate(payload: { sub: number }): Promise<AuthUser> {
    const user = await this.userModel.findByPk(payload.sub);
    if (!user) throw new UnauthorizedException('Compte introuvable.');
    return { userId: user.id, email: user.email, role: user.role };
  }
}
