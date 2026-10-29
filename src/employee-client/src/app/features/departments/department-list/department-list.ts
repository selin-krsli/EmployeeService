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

import { AppRole, Department, PAGE_SIZE } from '../../../core/models';
import { DepartmentService } from '../../../core/services';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { DepartmentFormModal } from '../department-form-modal/department-form-modal';

/** `department: null` opens the form in create mode. */
interface FormModalState {
  department: Department | null;
  readonly: boolean;
}

interface ActionMenuPosition {
  top: number;
  right: number;
}

@Component({
  selector: 'app-department-list',
  imports: [CommonModule, DepartmentFormModal, HasRoleDirective],
  templateUrl: './department-list.html',
  styleUrl: './department-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentList {
  protected readonly AppRole = AppRole;
  private readonly departmentService = inject(DepartmentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected departments: Department[] = [];
  protected loading = true;
  protected loadError = false;
  protected searchTerm = '';
  protected page = 1;
  protected readonly pageSize = PAGE_SIZE;
  protected totalCount = 0;
  private readonly search$ = new Subject<string>();
  private readonly load$ = new Subject<void>();
  protected actionMenuId: number | null = null;
  protected actionMenuPosition: ActionMenuPosition | null = null;
  protected deletingId: number | null = null;
  protected formModal: FormModalState | null = null;

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
          return this.departmentService.getPage(this.page, this.pageSize, this.searchTerm).pipe(
            catchError(() => {
              this.loadError = true;
              this.loading = false;
              this.departments = [];
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
        this.departments = result.items;
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

  protected loadDepartments(): void {
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

  protected openCreate(): void {
    this.formModal = { department: null, readonly: false };
  }

  protected openEdit(department: Department): void {
    this.openForm(department.id, false);
  }

  protected openView(department: Department): void {
    this.openForm(department.id, true);
  }

  protected closeForm(): void {
    this.formModal = null;
  }

  protected onSaved(): void {
    this.formModal = null;
    this.loadDepartments();
  }

  protected toggleActionMenu(event: MouseEvent, departmentId: number): void {
    event.stopPropagation();
    if (this.actionMenuId === departmentId) {
      this.closeActionMenu();
      return;
    }

    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const menuHeight = 100;
    const gap = 4;
    const openUp = window.innerHeight - rect.bottom < menuHeight + gap;

    this.actionMenuPosition = {
      top: openUp ? Math.max(gap, rect.top - menuHeight - gap) : rect.bottom + gap,
      right: Math.max(gap, window.innerWidth - rect.right),
    };
    this.actionMenuId = departmentId;
  }

  protected async deleteDepartment(department: Department): Promise<void> {
    this.closeActionMenu();

    const result = await Swal.fire({
      title: 'Birimi sil',
      text: `${department.name} kaydını silmek istediğinize emin misiniz?`,
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

    this.deletingId = department.id;
    this.departmentService
      .delete(department.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingId = null;
          this.cdr.markForCheck();
          this.loadDepartments();
          void Swal.fire({
            icon: 'success',
            title: 'Silindi',
            text: 'Birim kaydı başarıyla silindi.',
            timer: 1800,
            showConfirmButton: false,
          });
        },
        error: (error) => {
          this.deletingId = null;
          this.cdr.markForCheck();
          const message =
            error?.status === 409
              ? (error.error?.message ??
                'Bu birim personellere atanmış olduğu için silinemez.')
              : 'Birim silinemedi. Lütfen tekrar deneyin.';
          void Swal.fire({
            icon: 'error',
            title: 'Silinemedi',
            text: message,
            confirmButtonText: 'Tamam',
            confirmButtonColor: '#1b4f8a',
          });
        },
      });
  }

  /** Loads the latest record with `getById` before showing it in the form modal. */
  private openForm(id: number, readonly: boolean): void {
    this.closeActionMenu();
    this.departmentService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (department) => {
          this.formModal = { department, readonly };
          this.cdr.markForCheck();
        },
        error: () => {
          void Swal.fire({
            icon: 'error',
            title: 'Birim yüklenemedi',
            text: 'Kayıt bulunamadı veya sunucuya ulaşılamadı. Liste yenileniyor.',
            confirmButtonText: 'Tamam',
            confirmButtonColor: '#1b4f8a',
          });
          this.loadDepartments();
        },
      });
  }

  private closeActionMenu(): void {
    this.actionMenuId = null;
    this.actionMenuPosition = null;
  }
}
