import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './core/auth';
import { AppRole } from './core/models';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Giriş Yap',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'employees',
        title: 'Personel Listesi',
        loadComponent: () =>
          import('./features/employees/employee-list/employee-list').then((m) => m.EmployeeList),
      },
      {
        path: 'departments',
        title: 'Birim Listesi',
        loadComponent: () =>
          import('./features/departments/department-list/department-list').then(
            (m) => m.DepartmentList,
          ),
      },
      {
        path: 'users',
        title: 'Kullanıcılar',
        canActivate: [roleGuard],
        data: { roles: [AppRole.Admin] },
        loadComponent: () => import('./features/users/user-list/user-list').then((m) => m.UserList),
      },
      {
        path: 'roles',
        title: 'Rol ve İzinler',
        canActivate: [roleGuard],
        data: { roles: [AppRole.Admin] },
        loadComponent: () => import('./features/roles/role-list/role-list').then((m) => m.RoleList),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
