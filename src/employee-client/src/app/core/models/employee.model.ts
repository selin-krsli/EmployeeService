import { Address, AddressInput } from './address.model';

export interface Employee {
  id: number;
  employeeNumber: string;
  identityNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  dateOfBirth: string;
  hireDate: string;
  departmentId: number;
  departmentName: string;
  jobTitle: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  addresses: Address[];
}

export interface EmployeeInput {
  identityNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  dateOfBirth: string;
  hireDate: string;
  departmentId: number;
  jobTitle?: string | null;
  isActive: boolean;
  addresses: AddressInput[];
}
