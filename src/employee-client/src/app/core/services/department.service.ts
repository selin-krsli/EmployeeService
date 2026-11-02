import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Department, DepartmentInput, PagedResult } from '../models';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/departments`;

  getPage(page: number, pageSize: number, search: string): Observable<PagedResult<Department>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    const term = search.trim();
    if (term) {
      params = params.set('search', term);
    }
    return this.http.get<PagedResult<Department>>(`${this.baseUrl}/paged`, { params });
  }

  getById(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.baseUrl}/${id}`);
  }

  create(department: DepartmentInput): Observable<Department> {
    return this.http.post<Department>(this.baseUrl, department);
  }

  update(id: number, department: DepartmentInput): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/${id}`, department);
  }

  delete(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
