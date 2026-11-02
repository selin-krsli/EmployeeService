export const AppRole = {
  Admin: 'Admin',
  Viewer: 'Viewer',
} as const;

export type AppRole = (typeof AppRole)[keyof typeof AppRole];

export interface ModulePermission {
  module: string;
  label: string;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  userCount: number;
  permissions: ModulePermission[];
}
