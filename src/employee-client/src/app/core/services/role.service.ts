import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PagedResult, Role } from '../models';

/** HTTP gateway for `/api/roles` (Admin only). Each role carries its module permission matrix. */
@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/roles`;

  getAll(): Observable<Role[]> {
    return this.http.get<Role[]>(this.baseUrl);
  }

  getPage(page: number, pageSize: number, search = ''): Observable<PagedResult<Role>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    const term = search.trim();
    if (term) {
      params = params.set('search', term);
    }
    return this.http.get<PagedResult<Role>>(`${this.baseUrl}/paged`, { params });
  }
}
