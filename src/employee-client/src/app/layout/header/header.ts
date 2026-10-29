import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth';
import { User } from '../../core/models';
import { UserService } from '../../core/services';
import { UserFormModal } from '../../features/users/user-form-modal/user-form-modal';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, UserFormModal],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  @Output() readonly sidebarToggle = new EventEmitter<void>();

  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected profileUser: User | null = null;

  protected get user() {
    return this.auth.currentUser;
  }

  protected get initials(): string {
    const parts = (this.user?.name || this.user?.userName || '?').trim().split(/\s+/);
    const first = parts[0]?.charAt(0) ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return `${first}${last}`.toLocaleUpperCase('tr-TR');
  }

  protected openProfile(): void {
    if (!this.user) {
      return;
    }

    this.userService.me().subscribe({
      next: (user) => {
        this.profileUser = user;
        this.cdr.markForCheck();
      },
      error: () => {
        this.profileUser = null;
        this.cdr.markForCheck();
      },
    });
  }

  protected closeProfile(): void {
    this.profileUser = null;
  }

  protected logout(): void {
    this.auth.logout();
  }
}
