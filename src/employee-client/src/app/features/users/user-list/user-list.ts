import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { EMPTY, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { AuthService } from '../../../core/auth';
import { AppRole, PAGE_SIZE, User } from '../../../core/models';
import { UserService } from '../../../core/services';
import { InitialsPipe } from '../../../shared/pipes/initials.pipe';
import { UserFormModal } from '../user-form-modal/user-form-modal';
import { UserPasswordModal } from '../user-password-modal/user-password-modal';

/** `user: null` opens the form in create mode. */
interface FormModalState {
  user: User | null;
  readonly: boolean;
}

interface ActionMenuPosition {
  top: number;
  right: number;
}

@Component({
  selector: 'app-user-list',
  imports: [CommonModule, DatePipe, InitialsPipe, UserFormModal, UserPasswordModal],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserList {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly AppRole = AppRole;

  protected get currentUserId(): number | null {
    return this.auth.currentUser?.id ?? null;
  }

  protected users: User[] = [];
  protected loading = true;
  protected loadError = false;
  protected searchTerm = '';
  protected page = 1;
  protected readonly pageSize = PAGE_SIZE;
  protected totalCount = 0;
  private readonly search$ = new Subject<string>();
  private readonly load$ = new Subject<void>();
  protected deletingId: number | null = null;
  protected actionMenuId: number | null = null;
  protected actionMenuPosition: ActionMenuPosition | null = null;
  protected formModal: FormModalState | null = null;
  protected passwordUser: User | null = null;

  /** Employees that already own an account; the create form hides them from the dropdown. */
  protected get linkedEmployeeIds(): Set<number> {
    return new Set(this.users.flatMap((user) => (user.employeeId === null ? [] : [user.employeeId])));
  }

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
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const viewId = Number(params.get('view'));
      if (!Number.isInteger(viewId) || viewId <= 0) {
        return;
      }
      this.openViewById(viewId);
    });

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
          return this.userService.getPage(this.page, this.pageSize, this.searchTerm).pipe(
            catchError(() => {
              this.loadError = true;
              this.loading = false;
              this.users = [];
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
        this.users = result.items;
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

  protected loadUsers(): void {
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
    this.formModal = { user: null, readonly: false };
  }

  protected openEdit(user: User): void {
    this.closeActionMenu();
    this.formModal = { user, readonly: false };
  }

  protected openView(user: User): void {
    this.openViewById(user.id);
  }

  private openViewById(id: number): void {
    this.userService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.formModal = { user, readonly: true };
          this.cdr.markForCheck();
        },
        error: () => {
          void Swal.fire({
            icon: 'error',
            title: 'Kullanıcı yüklenemedi',
            text: 'Kayıt bulunamadı veya sunucuya ulaşılamadı.',
            confirmButtonText: 'Tamam',
            confirmButtonColor: '#1b4f8a',
          });
        },
      });
  }

  protected openPassword(user: User): void {
    this.closeActionMenu();
    this.passwordUser = user;
  }

  protected closeForm(): void {
    this.formModal = null;
  }

  protected closePassword(): void {
    this.passwordUser = null;
  }

  protected onSaved(): void {
    this.formModal = null;
    this.loadUsers();
  }

  protected onPasswordSaved(): void {
    this.passwordUser = null;
    void Swal.fire({
      icon: 'success',
      title: 'Parola güncellendi',
      text: 'Kullanıcı parolası başarıyla değiştirildi.',
      timer: 1800,
      showConfirmButton: false,
    });
  }

  protected toggleActionMenu(event: MouseEvent, userId: number): void {
    event.stopPropagation();
    if (this.actionMenuId === userId) {
      this.closeActionMenu();
      return;
    }

    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const menuHeight = 160;
    const gap = 4;
    const openUp = window.innerHeight - rect.bottom < menuHeight + gap;

    this.actionMenuPosition = {
      top: openUp ? Math.max(gap, rect.top - menuHeight - gap) : rect.bottom + gap,
      right: Math.max(gap, window.innerWidth - rect.right),
    };
    this.actionMenuId = userId;
  }

  protected async deleteUser(user: User): Promise<void> {
    this.closeActionMenu();

    if (user.id === this.currentUserId) {
      return;
    }

    const result = await Swal.fire({
      title: 'Kullanıcıyı sil',
      text: `${user.firstName} ${user.lastName} (@${user.userName}) hesabını silmek istediğinize emin misiniz?`,
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

    this.deletingId = user.id;
    this.userService
      .delete(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingId = null;
          this.cdr.markForCheck();
          this.loadUsers();
          void Swal.fire({
            icon: 'success',
            title: 'Silindi',
            text: 'Kullanıcı hesabı başarıyla silindi.',
            timer: 1800,
            showConfirmButton: false,
          });
        },
        error: (error: HttpErrorResponse) => {
          this.deletingId = null;
          this.cdr.markForCheck();
          void Swal.fire({
            icon: 'error',
            title: 'Silinemedi',
            text:
              error.status === 400
                ? (error.error?.message ??
                  'Sistemde en az bir aktif yönetici kalmalıdır; bu hesap silinemez.')
                : 'Kullanıcı silinemedi. Lütfen tekrar deneyin.',
            confirmButtonText: 'Tamam',
            confirmButtonColor: '#1b4f8a',
          });
        },
      });
  }

  private closeActionMenu(): void {
    this.actionMenuId = null;
    this.actionMenuPosition = null;
  }
}
