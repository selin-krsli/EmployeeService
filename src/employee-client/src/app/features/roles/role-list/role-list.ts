import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { AppRole, ModulePermission, PAGE_SIZE, Role } from '../../../core/models';
import { RoleService } from '../../../core/services';
import { RolePermissionsModal } from '../role-permissions-modal/role-permissions-modal';

interface PermissionSummary {
  granted: number;
  total: number;
  modules: number;
}

@Component({
  selector: 'app-role-list',
  imports: [CommonModule, RolePermissionsModal],
  templateUrl: './role-list.html',
  styleUrl: './role-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleList {
  private readonly roleService = inject(RoleService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly AppRole = AppRole;

  protected roles: Role[] = [];
  protected loading = true;
  protected loadError = false;
  protected selectedRole: Role | null = null;
  protected page = 1;
  protected readonly pageSize = PAGE_SIZE;
  protected totalCount = 0;
  private readonly load$ = new Subject<void>();

  protected get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  protected get pageNumbers(): number[] {
    const total = this.totalPages;
    const end = Math.min(total, Math.max(1, this.page - 2) + 4);
    const start = Math.max(1, end - 4);
    const pages: number[] = [];
    for (let n = start; n <= end; n++) {
      pages.push(n);
    }
    return pages;
  }

  constructor() {
    this.load$
      .pipe(
        switchMap(() => {
          this.loading = true;
          this.loadError = false;
          this.cdr.markForCheck();
          return this.roleService.getPage(this.page, this.pageSize).pipe(
            catchError(() => {
              this.loadError = true;
              this.loading = false;
              this.roles = [];
              this.totalCount = 0;
              this.cdr.markForCheck();
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result.items.length === 0 && this.page > 1) {
          this.page -= 1;
          this.load$.next();
          return;
        }
        this.roles = result.items;
        this.totalCount = result.totalCount;
        this.page = result.page;
        this.loading = false;
        this.cdr.markForCheck();
      });

    this.load$.next();
  }

  protected loadRoles(): void {
    this.load$.next();
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) {
      return;
    }
    this.page = page;
    this.load$.next();
  }

  protected summarize(permissions: ModulePermission[]): PermissionSummary {
    const flags = permissions.flatMap((p) => [p.canRead, p.canCreate, p.canUpdate, p.canDelete]);
    return {
      granted: flags.filter(Boolean).length,
      total: flags.length,
      modules: permissions.filter((p) => p.canRead || p.canCreate || p.canUpdate || p.canDelete)
        .length,
    };
  }

  protected openPermissions(role: Role): void {
    this.selectedRole = role;
  }

  protected closePermissions(): void {
    this.selectedRole = null;
  }
}
