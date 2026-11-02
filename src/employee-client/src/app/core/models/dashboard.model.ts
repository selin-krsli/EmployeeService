import { Employee } from './employee.model';

export interface DepartmentForPieChart {
  id: number;
  name: string;
  count: number;
  percent: number;
}

export interface DashboardData {
  totalEmployees: number;
  activeEmployees: number;
  passiveEmployees: number;
  totalDepartments: number;
  hiredThisMonth: number;
  departmentForPieChart: DepartmentForPieChart[];
  recentEmployees: Employee[];
}
