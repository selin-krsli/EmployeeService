import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { AuthService } from '../../core/auth';
import { AppRole } from '../../core/models';

interface NavLink {
  kind: 'link';
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
  /** Visible to everyone when omitted. */
  roles?: string[];
}

interface NavChild {
  label: string;
  route: string;
  icon: string;
  roles?: string[];
}

interface NavGroup {
  kind: 'group';
  id: string;
  label: string;
  icon: string;
  children: NavChild[];
  roles?: string[];
}

type NavEntry = NavLink | NavGroup;

const NAV_ENTRIES: NavEntry[] = [
  { kind: 'link', label: 'Dashboard', icon: 'bi-speedometer2', route: '/dashboard', exact: true },
  { kind: 'link', label: 'Personeller', icon: 'bi-people', route: '/employees' },
  {
    kind: 'group',
    id: 'definitions',
    label: 'Tanımlamalar',
    icon: 'bi-journal-text',
    children: [{ label: 'Birim', route: '/departments', icon: 'bi-diagram-3' }],
  },
  {
    kind: 'group',
    id: 'settings',
    label: 'Ayarlar',
    icon: 'bi-gear',
    roles: [AppRole.Admin],
    children: [
      { label: 'Kullanıcılar', route: '/users', icon: 'bi-person-gear' },
      { label: 'Rol ve İzinler', route: '/roles', icon: 'bi-shield-lock' },
    ],
  },
];

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  @Input() open = true;
  @Output() navigate = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Accordion state: only the group owning the current route starts open. */
  protected openGroupId: string | null = null;

  protected get entries(): NavEntry[] {
    const canSee = (roles?: string[]) => !roles || this.auth.hasRole(roles);

    return NAV_ENTRIES.filter((entry) => canSee(entry.roles))
      .map((entry) =>
        entry.kind === 'group'
          ? { ...entry, children: entry.children.filter((child) => canSee(child.roles)) }
          : entry,
      )
      .filter((entry) => entry.kind === 'link' || entry.children.length > 0);
  }

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map((event) => event.urlAfterRedirects),
        startWith(this.router.url),
        takeUntilDestroyed(),
      )
      .subscribe((url) => {
        const owner = NAV_ENTRIES.find(
          (entry): entry is NavGroup =>
            entry.kind === 'group' && entry.children.some((child) => url.startsWith(child.route)),
        );
        this.openGroupId = owner?.id ?? null;
        this.cdr.markForCheck();
      });
  }

  protected toggleGroup(groupId: string): void {
    this.openGroupId = this.openGroupId === groupId ? null : groupId;
  }
}
