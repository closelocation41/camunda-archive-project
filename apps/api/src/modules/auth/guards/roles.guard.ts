import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ROLE_LEVEL, Role } from '../roles';

type UserWithRoles = { roles?: Role[] };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) {
      return true;
    }

    const user = context.switchToHttp().getRequest<{ user?: UserWithRoles }>().user;
    const roles = user?.roles ?? [];
    const permitted = required.some((requiredRole) =>
      roles.some((userRole) => ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole]),
    );

    if (!permitted) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
