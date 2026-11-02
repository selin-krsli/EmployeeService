export interface User {
  id: number;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: number | null;
  employeeNumber: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  roles: string[];
}

export interface UserCreateInput {
  employeeId: number;
  userName: string;
  password: string;
  role: string;
}

export interface UserUpdateInput {
  userName: string;
  isActive: boolean;
  role: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
