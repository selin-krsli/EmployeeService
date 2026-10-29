import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Observable } from 'rxjs';

import { AppRole, Employee, Role, User } from '../../../core/models';
import { EmployeeService, RoleService, UserService } from '../../../core/services';
import { Modal } from '../../../shared/modal/modal';

const USER_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const PASSWORD_MIN_LENGTH = 6;

/**
 * Create / edit / view form for a user account.
 * Identity (name, email) always comes from the linked employee and is never typed in.
 */
@Component({
  selector: 'app-user-form-modal',
  imports: [CommonModule, ReactiveFormsModule, Modal],
  templateUrl: './user-form-modal.html',
  styleUrl: './user-form-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormModal implements OnInit {
  @Input() user: User | null = null;
  @Input() readonly = false;
  /** Employees that already have an account (excluded from the create dropdown). */
  @Input() linkedEmployeeIds: ReadonlySet<number> = new Set();
  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly userService = inject(UserService);
  private readonly employeeService = inject(EmployeeService);
  private readonly roleService = inject(RoleService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;

  protected employees: Employee[] = [];
  protected roles: Role[] = [];
  protected loadingOptions = true;
  protected saving = false;
  protected errorMessage: string | null = null;
  protected showPassword = false;

  private selectedEmployeeId: number | null = null;
  /** Accounts loaded for the create dropdown; the paged list does not contain every user. */
  private knownAccountEmployeeIds = new Set<number>();

  protected get isEdit(): boolean {
    return this.user !== null;
  }

  /** Seeded Admin/Viewer accounts are not linked to a personnel record. */
  protected get isSystemUser(): boolean {
    const roles = this.user?.roles ?? [];
    return roles.includes(AppRole.Admin) || roles.includes(AppRole.Viewer);
  }

  /** Create always shows the picker; edit hides it for Admin/Viewer and on detail view. */
  protected get showEmployeePicker(): boolean {
    return !this.readonly && !(this.isEdit && this.isSystemUser);
  }

  protected get title(): string {
    if (!this.user) {
      return 'Yeni Kullanıcı';
    }
    return this.readonly ? 'Kullanıcı Detayı' : 'Kullanıcı Güncelle';
  }

  protected readonly form = this.fb.group({
    employeeId: this.fb.control<number | null>(null, Validators.required),
    userName: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern(USER_NAME_PATTERN),
      ],
    ],
    password: [
      '',
      [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(100)],
    ],
    role: ['', Validators.required],
    isActive: [true],
  });

  /** Active employees without an account; in edit mode the user's own employee stays listed. */
  protected get employeeOptions(): Employee[] {
    const ownEmployeeId = this.user?.employeeId ?? null;
    const linked = new Set<number>([...this.linkedEmployeeIds, ...this.knownAccountEmployeeIds]);

    return this.employees
      .filter(
        (employee) =>
          employee.id === ownEmployeeId || (employee.isActive && !linked.has(employee.id)),
      )
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'tr-TR'),
      );
  }

  /** Empty admin/viewer identity still renders as readable text, not a blank caret. */
  protected identityText(value: string): string {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '-';
  }

  /** Read-only identity block: the picked employee, or the stored account data when editing. */
  protected get person(): { firstName: string; lastName: string; email: string } {
    const employee = this.employees.find((e) => e.id === this.selectedEmployeeId);
    if (employee) {
      return { firstName: employee.firstName, lastName: employee.lastName, email: employee.email };
    }

    const user = this.user;
    return user
      ? { firstName: user.firstName, lastName: user.lastName, email: user.email }
      : { firstName: '', lastName: '', email: '' };
  }

  ngOnInit(): void {
    if (this.readonly) {
      this.roles = (this.user?.roles ?? []).map((name, index) => ({
        id: index,
        name,
        description: null,
        userCount: 0,
        permissions: [],
      }));
      this.loadingOptions = false;
    } else {
      this.loadOptions();
    }

    this.selectedEmployeeId = this.form.controls.employeeId.value;

    const user = this.user;
    if (user) {
      this.form.patchValue({
        employeeId: user.employeeId,
        userName: user.userName,
        role: user.roles[0] ?? '',
        isActive: user.isActive,
      });
      this.selectedEmployeeId = user.employeeId;
      // Linked employee and password are not edited here (password has its own modal).
      this.form.controls.employeeId.disable();
      this.form.controls.employeeId.clearValidators();
      this.form.controls.password.clearValidators();
      this.form.controls.password.updateValueAndValidity({ emitEvent: false });
    }

    if (this.readonly) {
      this.form.disable({ emitEvent: false });
    }

    this.form.controls.employeeId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((employeeId) => {
        this.selectedEmployeeId = employeeId;
        this.suggestUserName(employeeId);
        this.cdr.markForCheck();
      });
  }

  protected isInvalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  protected submit(): void {
    if (this.readonly) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const user = this.user;
    const request$: Observable<unknown> = user
      ? this.userService.update(user.id, {
          userName: value.userName.trim(),
          isActive: value.isActive,
          role: value.role,
        })
      : this.userService.create({
          employeeId: value.employeeId!,
          userName: value.userName.trim(),
          password: value.password,
          role: value.role,
        });

    this.saving = true;
    this.errorMessage = null;
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving = false;
        this.cdr.markForCheck();
        this.saved.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.saving = false;
        this.errorMessage = this.toErrorMessage(error);
        this.cdr.markForCheck();
      },
    });
  }

  private loadOptions(): void {
    let pending = 3;
    const done = () => {
      pending -= 1;
      if (pending === 0) {
        this.loadingOptions = false;
        this.cdr.markForCheck();
      }
    };
    const fail = () => {
      this.errorMessage = 'Personel veya rol listesi yüklenemedi.';
      done();
    };

    this.employeeService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (employees) => {
          this.employees = employees;
          done();
        },
        error: fail,
      });

    this.userService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.knownAccountEmployeeIds = new Set(
            users.flatMap((account) => (account.employeeId === null ? [] : [account.employeeId])),
          );
          done();
        },
        error: fail,
      });

    this.roleService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.roles = roles;
          done();
        },
        error: fail,
      });
  }

  /** Pre-fills the user name from the email local part until the admin types one. */
  private suggestUserName(employeeId: number | null): void {
    const control = this.form.controls.userName;
    if (this.isEdit || control.dirty) {
      return;
    }

    const employee = this.employees.find((e) => e.id === employeeId);
    const suggestion = (employee?.email.split('@')[0] ?? '')
      .toLocaleLowerCase('en-US')
      .replace(/[^a-z0-9._-]/g, '')
      .slice(0, 50);
    control.setValue(suggestion);
  }

  private toErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0:
        return 'Sunucuya ulaşılamadı. Backend servisinin çalıştığından emin olun.';
      case 400:
        return error.error?.message ?? 'Gönderilen bilgiler geçersiz. Lütfen alanları kontrol edin.';
      case 403:
        return error.error?.message ?? 'Bu işlem için yetkiniz bulunmuyor.';
      case 404:
        return 'Kullanıcı bulunamadı. Liste güncel olmayabilir.';
      case 409:
        return error.error?.message ?? 'Bu bilgilerle kayıtlı bir kullanıcı zaten var.';
      default:
        return 'Kayıt sırasında beklenmeyen bir hata oluştu.';
    }
  }
}
