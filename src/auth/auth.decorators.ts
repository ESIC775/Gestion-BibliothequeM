import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export type Role = 'ADMIN' | 'MEMBER';

export interface AuthUser {
  userId: number;
  email: string;
  role: Role;
}

export const IS_PUBLIC_KEY = 'isPublic';
/** Route accessible sans être connecté (ex : login, inscription, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Route réservée à certains rôles (ex : @Roles('ADMIN') = bibliothécaire). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Récupère l'utilisateur connecté (rempli par la stratégie JWT). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);

export const isAdmin = (user?: AuthUser) => user?.role === 'ADMIN';
