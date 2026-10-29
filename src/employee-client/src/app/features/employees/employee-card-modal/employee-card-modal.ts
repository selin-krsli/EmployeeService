import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { Employee } from '../../../core/models';
import { Modal } from '../../../shared/modal/modal';
import { InitialsPipe } from '../../../shared/pipes/initials.pipe';

@Component({
  selector: 'app-employee-card-modal',
  imports: [CommonModule, Modal, InitialsPipe, DatePipe],
  templateUrl: './employee-card-modal.html',
  styleUrl: './employee-card-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeCardModal {
  @Input({ required: true }) employee!: Employee;
  @Output() readonly closed = new EventEmitter<void>();

  protected flipped = false;

  protected get homeAddress() {
    return this.employee.addresses.find((address) => address.addressType === 'Home');
  }

  protected get workAddress() {
    return this.employee.addresses.find((address) => address.addressType === 'Work');
  }

  protected toggleFlip(): void {
    this.flipped = !this.flipped;
  }
}
