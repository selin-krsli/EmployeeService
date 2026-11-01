import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Employee, EmployeeInput, PagedResult } from '../models';

/** HTTP gateway for `/api/employees`. */
@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/employees`;

  /** Server-side search and paging. The client only receives the current page. */
  getPage(page: number, pageSize: number, search: string, isActive: boolean): Observable<PagedResult<Employee>> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('isActive', isActive);
    const term = search.trim();
    if (term) {
      params = params.set('search', term);
    }
    return this.http.get<PagedResult<Employee>>(`${this.baseUrl}/paged`, { params });
  }

  getById(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.baseUrl}/${id}`);
  }

  create(employee: EmployeeInput): Observable<Employee> {
    return this.http.post<Employee>(this.baseUrl, employee);
  }

  /** Full update (PUT). Body is `{ success: true }`; failures come back as HTTP status codes. */
  update(id: number, employee: EmployeeInput): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/${id}`, employee);
  }

  delete(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
