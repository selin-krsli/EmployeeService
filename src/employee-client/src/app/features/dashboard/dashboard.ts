import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, map, of, switchMap } from 'rxjs';

import { DepartmentForPieChart, Employee } from '../../core/models';
import { DashboardService } from '../../core/services';
import { departmentColor } from '../../core/utils/department-colors';

interface DepartmentStat extends DepartmentForPieChart {
  color: string;
}

interface PieSlice extends DepartmentStat {
  path: string;
}

interface DashboardReady {
  status: 'ready';
  totalEmployees: number;
  activeEmployees: number;
  passiveEmployees: number;
  totalDepartments: number;
  hiredThisMonth: number;
  departmentStats: DepartmentStat[];
  pieSlices: PieSlice[];
  recentEmployees: Employee[];
}

type DashboardState = { status: 'loading' } | { status: 'error' } | DashboardReady;

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly dashboardService = inject(DashboardService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  protected state: DashboardState = { status: 'loading' };

  protected get readyState(): DashboardReady | null {
    return this.state.status === 'ready' ? this.state : null;
  }

  constructor() {
    this.refresh$
      .pipe(
        switchMap(() =>
          this.dashboardService.get().pipe(
            map((data): DashboardState => {
              const departmentStats: DepartmentStat[] = data.departmentForPieChart.map((dept) => ({
                ...dept,
                color: departmentColor(dept.id, dept.name),
              }));

              return {
                status: 'ready',
                totalEmployees: data.totalEmployees,
                activeEmployees: data.activeEmployees,
                passiveEmployees: data.passiveEmployees,
                totalDepartments: data.totalDepartments,
                hiredThisMonth: data.hiredThisMonth,
                departmentStats,
                pieSlices: this.buildPieSlices(departmentStats),
                recentEmployees: data.recentEmployees,
              };
            }),
            catchError(() => of<DashboardState>({ status: 'error' })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((next) => {
        this.state = next;
        this.cdr.markForCheck();
      });
  }

  protected refresh(): void {
    this.refresh$.next();
  }

  private buildPieSlices(stats: DepartmentStat[]): PieSlice[] {
    const withCount = stats.filter((stat) => stat.count > 0);
    const total = withCount.reduce((sum, stat) => sum + stat.count, 0);
    if (total === 0) {
      return [];
    }

    const cx = 100;
    const cy = 100;
    const radius = 90;
    let angle = -Math.PI / 2;

    return withCount.map((stat) => {
      const sliceAngle = (stat.count / total) * Math.PI * 2;
      const start = angle;
      const end = angle + sliceAngle;
      angle = end;

      return {
        ...stat,
        percent: Math.round((stat.count / total) * 100),
        path: this.describeSlice(cx, cy, radius, start, end),
      };
    });
  }

  private describeSlice(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
  ): string {
    const fullCircle = Math.abs(endAngle - startAngle) >= Math.PI * 2 - 1e-6;
    if (fullCircle) {
      return [
        `M ${cx} ${cy - radius}`,
        `A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius}`,
        `A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius}`,
        'Z',
      ].join(' ');
    }

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }
}
