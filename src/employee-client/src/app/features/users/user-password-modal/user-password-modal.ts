import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
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
import { finalize } from 'rxjs/operators';

import { User } from '../../../core/models';
import { UserService } from '../../../core/services';
import { Modal } from '../../../shared/modal/modal';

const PASSWORD_MIN_LENGTH = 6;

@Component({
  selector: 'app-user-password-modal',
  imports: [CommonModule, ReactiveFormsModule, Modal],
  templateUrl: './user-password-modal.html',
  styleUrl: './user-password-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPasswordModal {
  @Input({ required: true }) user!: User;
  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;
  protected saving = false;
  protected showCurrent = false;
  protected showNew = false;

  protected readonly form = this.fb.group({
    currentPassword: [
      '',
      [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(100)],
    ],
    newPassword: [
      '',
      [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(100)],
    ],
  });

  constructor() {
    this.form.controls.currentPassword.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clearServerError(this.form.controls.currentPassword));

    this.form.controls.newPassword.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clearServerError(this.form.controls.newPassword));
  }

  protected isInvalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  protected toggleCurrent(): void {
    this.showCurrent = !this.showCurrent;
    this.cdr.markForCheck();
  }

  protected toggleNew(): void {
    this.showNew = !this.showNew;
    this.cdr.markForCheck();
  }

  protected submit(): void {
    // A previous server error must not block the next attempt.
    this.clearServerError(this.form.controls.currentPassword);
    this.clearServerError(this.form.controls.newPassword);

    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    const value = this.form.getRawValue();
    this.saving = true;
    this.cdr.markForCheck();

    this.userService
      .changePassword(this.user.id, {
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => this.saved.emit(),
        error: (error: HttpErrorResponse) => this.applyServerError(error),
      });
  }

  private applyServerError(error: HttpErrorResponse): void {
    if (error.status !== 400) {
      return;
    }

    const message = error.error?.message as string | undefined;
    const field = error.error?.field as string | undefined;
    if (!message) {
      return;
    }

    if (field === 'CurrentPassword') {
      this.form.controls.currentPassword.setErrors({ server: message });
      this.form.controls.currentPassword.markAsTouched();
      return;
    }

    if (field === 'NewPassword') {
      this.form.controls.newPassword.setErrors({ server: message });
      this.form.controls.newPassword.markAsTouched();
    }
  }

  private clearServerError(control: AbstractControl): void {
    if (!control.hasError('server')) {
      return;
    }

    control.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
  }
}
