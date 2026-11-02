import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService, loginReturnQuery } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.getToken()) {
    return true;
  }
  const queryParams = loginReturnQuery(state.url);
  return inject(Router).createUrlTree(['/login'], { queryParams });
};

export const roleGuard: CanActivateFn = (route) => {
  const roles = (route.data['roles'] as string[] | undefined) ?? [];
  if (roles.length === 0 || inject(AuthService).hasRole(roles)) {
    return true;
  }
  return inject(Router).createUrlTree(['/dashboard']);
};

export const guestGuard: CanActivateFn = () => {
  if (!inject(AuthService).getToken()) {
    return true;
  }
  return inject(Router).createUrlTree(['/dashboard']);
};
