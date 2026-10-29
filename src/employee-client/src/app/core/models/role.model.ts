/** Role names issued by the backend (`AppRoles`). */
export const AppRole = {
  Admin: 'Admin',
  Viewer: 'Viewer',
} as const;

export type AppRole = (typeof AppRole)[keyof typeof AppRole];

/** CRUD flags of one module, as defined by the backend permission matrix. */
export interface ModulePermission {
  module: string;
  label: string;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

/** Role as returned by the API (`RoleDto`). */
export interface Role {
  id: number;
  name: string;
  description: string | null;
  userCount: number;
  permissions: ModulePermission[];
}
