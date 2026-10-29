import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';

/** Matches Bootstrap's `lg` breakpoint: below it the sidebar behaves as an overlay. */
const MOBILE_QUERY = '(max-width: 991.98px)';

@Component({
  selector: 'app-main-layout',
  imports: [CommonModule, RouterOutlet, Header, Sidebar],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {
  private readonly mediaQuery = window.matchMedia(MOBILE_QUERY);
  private readonly cdr = inject(ChangeDetectorRef);

  protected isMobile = this.mediaQuery.matches;
  protected sidebarOpen = !this.mediaQuery.matches;

  constructor() {
    const onChange = (event: MediaQueryListEvent) => {
      this.isMobile = event.matches;
      this.sidebarOpen = !event.matches;
      this.cdr.markForCheck();
    };
    this.mediaQuery.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => this.mediaQuery.removeEventListener('change', onChange));
  }

  protected toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  protected closeSidebarOnMobile(): void {
    if (this.isMobile) {
      this.sidebarOpen = false;
    }
  }
}
