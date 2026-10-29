/** User account as returned by the API (`UserDto`). Name and email are copied from the linked employee. */
export interface User {
  id: number;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: number | null;
  employeeNumber: string | null;
  isActive: boolean;
  createdAt: string;
  roles: string[];
}

/** Request payload for `POST /api/auth/register`. */
export interface UserCreateInput {
  employeeId: number;
  userName: string;
  password: string;
  role: string;
}

/** Request payload for `PUT /api/users/{id}`. */
export interface UserUpdateInput {
  userName: string;
  isActive: boolean;
  role: string;
}

/** Request payload for `PUT /api/users/{id}/change-password`. */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
