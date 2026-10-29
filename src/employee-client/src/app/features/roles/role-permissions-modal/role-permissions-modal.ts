import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { ModulePermission, Role } from '../../../core/models';
import { Modal } from '../../../shared/modal/modal';

interface PermissionFlag {
  label: string;
  granted: boolean;
}

/** Read-only "Yetki Dağılımı" view: one card per module with its CRUD flags. */
@Component({
  selector: 'app-role-permissions-modal',
  imports: [CommonModule, Modal],
  templateUrl: './role-permissions-modal.html',
  styleUrl: './role-permissions-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolePermissionsModal {
  @Input({ required: true }) role!: Role;
  @Output() closed = new EventEmitter<void>();

  protected get title(): string {
    return `${this.role.name} - Yetki Dağılımı`;
  }

  protected flags(permission: ModulePermission): PermissionFlag[] {
    return [
      { label: 'Read', granted: permission.canRead },
      { label: 'Create', granted: permission.canCreate },
      { label: 'Update', granted: permission.canUpdate },
      { label: 'Delete', granted: permission.canDelete },
    ];
  }

  protected grantedCount(permission: ModulePermission): number {
    return this.flags(permission).filter((flag) => flag.granted).length;
  }
}
