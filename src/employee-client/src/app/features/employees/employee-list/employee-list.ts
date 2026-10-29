import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { AppRole, Employee, PAGE_SIZE } from '../../../core/models';
import { EmployeeService } from '../../../core/services';
import { departmentColor } from '../../../core/utils/department-colors';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { EmployeeCardModal } from '../employee-card-modal/employee-card-modal';
import { EmployeeFormModal } from '../employee-form-modal/employee-form-modal';

/** `employee: null` opens the form in create mode. */
interface FormModalState {
  employee: Employee | null;
  readonly: boolean;
}

interface ActionMenuPosition {
  top: number;
  right: number;
}

@Component({
  selector: 'app-employee-list',
  imports: [CommonModule, EmployeeFormModal, EmployeeCardModal, HasRoleDirective],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeList {
  protected readonly AppRole = AppRole;
  private readonly employeeService = inject(EmployeeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected employees: Employee[] = [];
  protected loading = true;
  protected loadError = false;
  protected searchTerm = '';
  protected page = 1;
  protected readonly pageSize = PAGE_SIZE;
  protected totalCount = 0;
  /** `true` = aktif personeller, `false` = pasif personeller */
  protected showActive = true;
  private readonly search$ = new Subject<string>();
  private readonly load$ = new Subject<void>();
  protected actionMenuId: number | null = null;
  protected actionMenuPosition: ActionMenuPosition | null = null;
  protected deletingId: number | null = null;

  protected formModal: FormModalState | null = null;
  protected cardEmployee: Employee | null = null;

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
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page = 1;
        this.load$.next();
      });

    this.load$
      .pipe(
        switchMap(() => {
          this.loading = true;
          this.loadError = false;
          this.cdr.markForCheck();
          return this.employeeService.getPage(this.page, this.pageSize, this.searchTerm, this.showActive).pipe(
            catchError(() => {
              this.loadError = true;
              this.loading = false;
              this.employees = [];
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
        this.employees = result.items;
        this.totalCount = result.totalCount;
        this.page = result.page;
        this.loading = false;
        this.cdr.markForCheck();
      });

    this.load$.next();
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.closeActionMenu();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  protected onViewportChange(): void {
    this.closeActionMenu();
  }

  protected loadEmployees(): void {
    this.load$.next();
  }

  protected onSearchInput(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.search$.next(this.searchTerm);
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) {
      return;
    }
    this.page = page;
    this.load$.next();
  }

  protected departmentColor = departmentColor;

  protected toggleActiveFilter(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showActive = !this.showActive;
    this.page = 1;
    this.load$.next();
  }

  protected openCreate(): void {
    this.formModal = { employee: null, readonly: false };
  }

  protected openEdit(employee: Employee): void {
    this.openForm(employee.id, false);
  }

  protected openView(employee: Employee): void {
    this.openForm(employee.id, true);
  }

  protected closeForm(): void {
    this.formModal = null;
  }

  protected onSaved(): void {
    this.formModal = null;
    this.loadEmployees();
  }

  protected openCard(employee: Employee): void {
    this.closeActionMenu();
    this.cardEmployee = employee;
  }

  protected closeCard(): void {
    this.cardEmployee = null;
  }

  protected toggleActionMenu(event: MouseEvent, employeeId: number): void {
    event.stopPropagation();
    if (this.actionMenuId === employeeId) {
      this.closeActionMenu();
      return;
    }

    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const menuHeight = 140;
    const gap = 4;
    const openUp = window.innerHeight - rect.bottom < menuHeight + gap;

    this.actionMenuPosition = {
      top: openUp ? Math.max(gap, rect.top - menuHeight - gap) : rect.bottom + gap,
      right: Math.max(gap, window.innerWidth - rect.right),
    };
    this.actionMenuId = employeeId;
  }

  protected async deleteEmployee(employee: Employee): Promise<void> {
    this.closeActionMenu();

    const result = await Swal.fire({
      title: 'Personeli sil',
      text: `${employee.firstName} ${employee.lastName} kaydını silmek istediğinize emin misiniz?`,
      icon: 'warning',
      showCancelButton: true,
      focusCancel: true,
      confirmButtonText: 'Evet, sil',
      cancelButtonText: 'Vazgeç',
      confirmButtonColor: '#d64550',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    this.deletingId = employee.id;
    this.employeeService
      .delete(employee.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingId = null;
          this.cdr.markForCheck();
          this.loadEmployees();
          void Swal.fire({
            icon: 'success',
            title: 'Silindi',
            text: 'Personel kaydı başarıyla silindi.',
            timer: 1800,
            showConfirmButton: false,
          });
        },
        error: (error) => {
          this.deletingId = null;
          this.cdr.markForCheck();
          void Swal.fire({
            icon: 'error',
            title: 'Silinemedi',
            text: error?.error?.message ?? 'Personel silinemedi. Lütfen tekrar deneyin.',
            confirmButtonText: 'Tamam',
            confirmButtonColor: '#1b4f8a',
          });
        },
      });
  }

  /** Loads the latest record with `getById` before showing it in the form modal. */
  private openForm(id: number, readonly: boolean): void {
    this.closeActionMenu();
    this.employeeService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (employee) => {
          this.formModal = { employee, readonly };
          this.cdr.markForCheck();
        },
        error: () => {
          void Swal.fire({
            icon: 'error',
            title: 'Personel yüklenemedi',
            text: 'Kayıt bulunamadı veya sunucuya ulaşılamadı. Liste yenileniyor.',
            confirmButtonText: 'Tamam',
            confirmButtonColor: '#1b4f8a',
          });
          this.loadEmployees();
        },
      });
  }

  private closeActionMenu(): void {
    this.actionMenuId = null;
    this.actionMenuPosition = null;
  }
}
