import { Employee } from './employee.model';

/** Pie chart dilimi (`DepartmentForPieChartDto`). */
export interface DepartmentForPieChart {
  id: number;
  name: string;
  count: number;
  percent: number;
}

/** Dashboard payload from `GET /api/dashboard` (`DashboardDto`). */
export interface DashboardData {
  totalEmployees: number;
  activeEmployees: number;
  passiveEmployees: number;
  totalDepartments: number;
  hiredThisMonth: number;
  departmentForPieChart: DepartmentForPieChart[];
  recentEmployees: Employee[];
}
