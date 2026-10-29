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

import { Department } from '../../../core/models';
import { DepartmentService } from '../../../core/services';
import { Modal } from '../../../shared/modal/modal';

/** Shared create / detail-edit form. Pass `department` to edit, omit it to create. */
@Component({
  selector: 'app-department-form-modal',
  imports: [CommonModule, ReactiveFormsModule, Modal],
  templateUrl: './department-form-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentFormModal implements OnInit {
  @Input() department: Department | null = null;
  @Input() readonly = false;
  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly departmentService = inject(DepartmentService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  protected get title(): string {
    if (!this.department) {
      return 'Yeni Birim';
    }
    return this.readonly ? 'Birim Görüntüle' : 'Birim Güncelle';
  }

  protected saving = false;
  protected errorMessage: string | null = null;

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
  });

  ngOnInit(): void {
    const department = this.department;
    if (department) {
      this.form.patchValue({ name: department.name });
    }

    if (this.readonly) {
      this.form.disable({ emitEvent: false });
    }
  }

  protected isInvalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  protected submit(): void {
    if (this.readonly) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = { name: this.form.getRawValue().name.trim() };
    const department = this.department;
    const request$: Observable<unknown> = department
      ? this.departmentService.update(department.id, payload)
      : this.departmentService.create(payload);

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

  private toErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0:
        return 'Sunucuya ulaşılamadı. Backend servisinin çalıştığından emin olun.';
      case 400:
        return 'Gönderilen bilgiler geçersiz. Lütfen alanları kontrol edin.';
      case 404:
        return 'Birim bulunamadı. Liste güncel olmayabilir.';
      case 409:
        return error.error?.message ?? 'Bu isimde bir birim zaten kayıtlı.';
      default:
        return 'Kayıt sırasında beklenmeyen bir hata oluştu.';
    }
  }
}
