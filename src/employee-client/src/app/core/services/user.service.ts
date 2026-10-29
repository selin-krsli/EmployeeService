import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChangePasswordInput, PagedResult, User, UserCreateInput, UserUpdateInput } from '../models';

/** HTTP gateway for `/api/users` (Admin only); accounts are created through `/api/auth/register`. */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl);
  }

  /** Server-side search and paging. The client only receives the current page. */
  getPage(page: number, pageSize: number, search: string): Observable<PagedResult<User>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    const term = search.trim();
    if (term) {
      params = params.set('search', term);
    }
    return this.http.get<PagedResult<User>>(`${this.baseUrl}/paged`, { params });
  }

  /** Signed-in account (`GET /api/auth/me`). */
  me(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`);
  }

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  create(user: UserCreateInput): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/auth/register`, user);
  }

  update(id: number, user: UserUpdateInput): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/${id}`, user);
  }

  changePassword(id: number, body: ChangePasswordInput): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/change-password`, body);
  }

  delete(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
