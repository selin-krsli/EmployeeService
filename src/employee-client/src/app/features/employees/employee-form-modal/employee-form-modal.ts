import { CommonModule, DatePipe } from '@angular/common';
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
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Observable, catchError, map, of } from 'rxjs';

import {
  ADDRESS_TYPES,
  ADDRESS_TYPE_LABELS,
  Address,
  AddressType,
  Department,
  Employee,
  EmployeeInput,
} from '../../../core/models';
import { DepartmentService, EmployeeService } from '../../../core/services';
import { Modal } from '../../../shared/modal/modal';

const LOOKUP_PAGE_SIZE = 50;

/** 5xx (10 digits) or 05xx (11 digits). Empty stays valid because the field is optional. */
const TR_MOBILE_DIGITS = /^(0?5\d{9})$/;

function optionalTrMobile(control: AbstractControl): { phone: true } | null {
  const digits = String(control.value ?? '').replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  return TR_MOBILE_DIGITS.test(digits) ? null : { phone: true };
}

/**
 * Groups a mobile number as the user types.
 * A leading 0 allows 11 digits (0532 888 99 00); otherwise 10 digits (532 888 99 00).
 */
function formatTrMobile(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  const groupedFromStart = digits.startsWith('0') ? [4, 3, 2, 2] : [3, 3, 2, 2];
  digits = digits.slice(0, digits.startsWith('0') ? 11 : 10);

  const parts: string[] = [];
  let cursor = 0;
  for (const size of groupedFromStart) {
    if (cursor >= digits.length) {
      break;
    }
    parts.push(digits.slice(cursor, cursor + size));
    cursor += size;
  }
  return parts.join(' ');
}

/** Stored form is always 05XXXXXXXXX. A 10-digit 5xx entry gains the trunk prefix. */
function canonicalTrMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!TR_MOBILE_DIGITS.test(digits)) {
    return null;
  }
  return digits.length === 10 ? `0${digits}` : digits;
}

type AddressForm = FormGroup<{
  addressType: FormControl<AddressType>;
  city: FormControl<string>;
  district: FormControl<string>;
  postalCode: FormControl<string>;
  fullAddress: FormControl<string>;
  country: FormControl<string>;
  updatedAt: FormControl<string | null>;
}>;

/** Shared create / detail-edit form. Pass `employee` to edit, omit it to create. */
@Component({
  selector: 'app-employee-form-modal',
  imports: [CommonModule, ReactiveFormsModule, DatePipe, Modal],
  templateUrl: './employee-form-modal.html',
  styleUrl: './employee-form-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeFormModal implements OnInit {
  @Input() employee: Employee | null = null;
  @Input() readonly = false;
  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly employeeService = inject(EmployeeService);
  private readonly departmentService = inject(DepartmentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly addressTypes = ADDRESS_TYPES;
  protected readonly addressTypeLabels = ADDRESS_TYPE_LABELS;

  protected departments: Department[] = [];

  protected get title(): string {
    if (!this.employee) {
      return 'Yeni Personel';
    }
    return this.readonly ? 'Personel Görüntüle' : 'Personel Güncelle';
  }

  protected saving = false;
  protected errorMessage: string | null = null;
  /** Bumps when address rows change so OnPush templates re-evaluate helpers. */
  protected addressRevision = 0;

  protected readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    identityNumber: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    phoneNumber: ['', [Validators.maxLength(14), optionalTrMobile]],
    dateOfBirth: ['', Validators.required],
    hireDate: ['', Validators.required],
    departmentId: this.fb.control<number | null>(null, Validators.required),
    jobTitle: ['', Validators.maxLength(100)],
    isActive: [true],
    addresses: this.fb.array<AddressForm>([]),
  });

  protected get addresses(): FormArray<AddressForm> {
    return this.form.controls.addresses;
  }

  protected get canAddAddress(): boolean {
    void this.addressRevision;
    return !this.readonly && this.unusedAddressTypes().length > 0;
  }

  ngOnInit(): void {
    this.departmentService
      .getPage(1, LOOKUP_PAGE_SIZE, '')
      .pipe(
        map((result) => result.items),
        catchError(() => of<Department[]>([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((departments) => {
        this.departments = departments;
        this.cdr.markForCheck();
      });

    const employee = this.employee;
    if (!employee) {
      return;
    }

    this.form.patchValue({
      firstName: employee.firstName,
      lastName: employee.lastName,
      identityNumber: employee.identityNumber,
      email: employee.email,
      phoneNumber: formatTrMobile(employee.phoneNumber ?? ''),
      dateOfBirth: employee.dateOfBirth,
      hireDate: employee.hireDate,
      departmentId: employee.departmentId,
      jobTitle: employee.jobTitle ?? '',
      isActive: employee.isActive,
    });
    employee.addresses.forEach((address) => this.addresses.push(this.createAddressGroup(address)));
    this.bumpAddressRevision();

    if (this.readonly) {
      // Disabled inputs often hide placeholders; put a real "-" into empty string fields.
      this.fillEmptyStringsWithDash(this.form);
      this.form.disable({ emitEvent: false });
    }
  }

  protected addAddress(): void {
    if (!this.canAddAddress) {
      return;
    }

    const nextType = this.unusedAddressTypes()[0];
    this.addresses.push(this.createAddressGroup(undefined, nextType));
    this.bumpAddressRevision();
  }

  protected removeAddress(index: number): void {
    if (this.readonly) {
      return;
    }
    this.addresses.removeAt(index);
    this.bumpAddressRevision();
  }

  protected onAddressTypeChange(): void {
    this.bumpAddressRevision();
  }

  /** Types selectable for a row: current value + still unused types. */
  protected availableTypesFor(index: number): AddressType[] {
    void this.addressRevision;
    const current = this.addresses.at(index).controls.addressType.value;
    return ADDRESS_TYPES.filter(
      (type) =>
        type === current ||
        !this.addresses.controls.some(
          (group, i) => i !== index && group.controls.addressType.value === type,
        ),
    );
  }

  protected isInvalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  /** Strips letters and extra digits, then groups 5xx or 05xx as it was typed. */
  protected onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatTrMobile(input.value);
    if (this.form.controls.phoneNumber.value === formatted && input.value === formatted) {
      return;
    }
    this.form.controls.phoneNumber.setValue(formatted);
    input.value = formatted;
  }

  protected submit(): void {
    if (this.readonly) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.hasDuplicateAddressTypes()) {
      this.errorMessage = 'Her adres tipi (Ev / İş) yalnızca bir kez eklenebilir.';
      return;
    }

    const value = this.form.getRawValue();
    const payload: EmployeeInput = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      identityNumber: value.identityNumber,
      email: value.email.trim(),
      phoneNumber: canonicalTrMobile(value.phoneNumber),
      dateOfBirth: value.dateOfBirth,
      hireDate: value.hireDate,
      departmentId: value.departmentId!,
      jobTitle: value.jobTitle.trim() || null,
      isActive: value.isActive,
      addresses: value.addresses.map((address) => ({
        addressType: address.addressType,
        city: address.city,
        district: address.district,
        postalCode: address.postalCode.trim() || null,
        fullAddress: address.fullAddress,
        country: address.country,
      })),
    };

    const employee = this.employee;
    const request$: Observable<unknown> = employee
      ? this.employeeService.update(employee.id, payload)
      : this.employeeService.create(payload);

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

  private bumpAddressRevision(): void {
    this.addressRevision += 1;
    this.cdr.markForCheck();
  }

  /** Walks the form tree and replaces blank string values with "-" (detail view only). */
  private fillEmptyStringsWithDash(control: AbstractControl): void {
    if (control instanceof FormGroup || control instanceof FormArray) {
      Object.values(control.controls).forEach((child) => this.fillEmptyStringsWithDash(child));
      return;
    }

    const value = control.value;
    if (typeof value === 'string' && value.trim() === '') {
      control.setValue('-', { emitEvent: false });
    }
  }

  private createAddressGroup(address?: Address, preferredType?: AddressType): AddressForm {
    return this.fb.group({
      addressType: this.fb.control<AddressType>(
        address?.addressType ?? preferredType ?? 'Home',
        Validators.required,
      ),
      city: [address?.city ?? '', [Validators.required, Validators.maxLength(100)]],
      district: [address?.district ?? '', [Validators.required, Validators.maxLength(100)]],
      postalCode: [address?.postalCode ?? '', Validators.maxLength(10)],
      fullAddress: [address?.fullAddress ?? '', [Validators.required, Validators.maxLength(130)]],
      country: [address?.country ?? 'Türkiye', [Validators.required, Validators.maxLength(100)]],
      updatedAt: this.fb.control<string | null>(address?.updatedAt ?? null),
    });
  }

  private unusedAddressTypes(): AddressType[] {
    const used = new Set(this.addresses.controls.map((group) => group.controls.addressType.value));
    return ADDRESS_TYPES.filter((type) => !used.has(type));
  }

  private hasDuplicateAddressTypes(): boolean {
    const types = this.addresses.controls.map((group) => group.controls.addressType.value);
    return new Set(types).size !== types.length;
  }

  private toErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0:
        return 'Sunucuya ulaşılamadı. Backend servisinin çalıştığından emin olun.';
      case 400:
        return error.error?.message ?? 'Gönderilen bilgiler geçersiz. Lütfen alanları kontrol edin.';
      case 404:
        return 'Personel bulunamadı. Liste güncel olmayabilir.';
      case 409:
        return error.error?.message ?? 'Bu TC kimlik numarasıyla kayıtlı bir personel zaten var.';
      default:
        return 'Kayıt sırasında beklenmeyen bir hata oluştu.';
    }
  }
}
