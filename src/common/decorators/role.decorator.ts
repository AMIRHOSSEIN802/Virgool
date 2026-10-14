import { SetMetadata } from '@nestjs/common';
import { Roles } from '../enums/role.eunm';

export const ROLE_KEY = 'ROLES';
export const CanAccess = (...roles: Roles[]) => SetMetadata(ROLE_KEY, roles);
