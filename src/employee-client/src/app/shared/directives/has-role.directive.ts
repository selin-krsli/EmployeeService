import {
  Directive,
  DoCheck,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';

import { AuthService } from '../../core/auth';

/**
 * Renders its template only when the signed-in user holds at least one of the given roles.
 *
 * ```html
 * <button *hasRole="'Admin'">Sil</button>
 * <button *hasRole="['Admin', 'Viewer']; else noAccess">Görüntüle</button>
 * ```
 *
 * UI-only convenience: the API enforces the same rules with `[Authorize(Roles = ...)]`.
 */
@Directive({ selector: '[hasRole]' })
export class HasRoleDirective implements DoCheck {
  @Input({ required: true }) hasRole!: string | readonly string[];
  @Input() hasRoleElse: TemplateRef<unknown> | null = null;

  private readonly auth = inject(AuthService);
  private readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private rendered: TemplateRef<unknown> | null = null;
  private lastRolesKey = '';
  private lastHasRoleKey = '';
  private lastHasRoleElse: TemplateRef<unknown> | null | undefined;
  private needsInitialRender = true;

  ngDoCheck(): void {
    const rolesKey = this.auth.roles.join('\0');
    const hasRoleKey = Array.isArray(this.hasRole)
      ? this.hasRole.join('\0')
      : String(this.hasRole);
    const elseRef = this.hasRoleElse;
    if (
      !this.needsInitialRender &&
      rolesKey === this.lastRolesKey &&
      hasRoleKey === this.lastHasRoleKey &&
      elseRef === this.lastHasRoleElse
    ) {
      return;
    }
    this.needsInitialRender = false;
    this.lastRolesKey = rolesKey;
    this.lastHasRoleKey = hasRoleKey;
    this.lastHasRoleElse = elseRef;
    this.updateView();
  }

  private updateView(): void {
    const target = this.auth.hasRole(this.hasRole) ? this.templateRef : this.hasRoleElse;
    if (target === this.rendered) {
      return;
    }

    this.viewContainer.clear();
    if (target) {
      this.viewContainer.createEmbeddedView(target);
    }
    this.rendered = target;
  }
}
