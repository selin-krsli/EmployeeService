import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { DashboardData } from '../models';

/** HTTP gateway for `/api/dashboard`. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  get(): Observable<DashboardData> {
    return this.http.get<DashboardData>(this.baseUrl);
  }
}
