export enum Role {
  Admin = 'Admin',
  Operator = 'Operator',
  Auditor = 'Auditor',
  Viewer = 'Viewer',
}

export const ROLE_LEVEL: Record<Role, number> = {
  [Role.Viewer]: 1,
  [Role.Auditor]: 2,
  [Role.Operator]: 3,
  [Role.Admin]: 4,
};
