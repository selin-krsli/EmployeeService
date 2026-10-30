import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService, loginReturnQuery } from '../../../core/auth';
import { environment } from '../../../../environments/environment';

interface LoginFeedback {
  ok: boolean;
  text: string;
}

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  protected isSubmitting = false;
  protected feedback: LoginFeedback | null = null;
  protected showPassword = false;

  protected readonly loginForm = this.fb.group({
    login: ['admin', [Validators.required]],
    password: ['Admin123!', [Validators.required, Validators.minLength(6)]],
  });

  protected get f() {
    return this.loginForm.controls;
  }

  protected onSubmit(): void {
    if (this.loginForm.invalid || this.isSubmitting) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.feedback = null;

    const { login, password } = this.loginForm.getRawValue();

    this.authService
      .login({ userName: login.trim(), password })
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.feedback = {
            ok: true,
            text: 'Giriş başarılı. Panele yönlendiriliyorsunuz.',
          };
          this.cdr.markForCheck();
          void this.router.navigateByUrl(this.returnUrl(), { replaceUrl: true });
        },
        error: (err: unknown) => {
          this.feedback = { ok: false, text: this.describeFailure(err) };
          this.cdr.markForCheck();
        },
      });
  }

  ngOnInit(): void {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    if (url !== null && loginReturnQuery(url) === undefined) {
      void this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
    this.cdr.markForCheck();
  }

  /** Turns an empty network failure into a reason the user can read. */
  private describeFailure(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      const detail = err instanceof Error ? err.message : '';
      return detail
        ? `Giriş başarısız: ${detail}`
        : 'Giriş başarısız. Sunucudan yanıt alınamadı.';
    }

    if (err.status === 0) {
      return `Giriş başarısız: sunucuya ulaşılamadı. ${environment.apiUrl} yanıt dönmedi (Failed to fetch). API çalışmıyor olabilir.`;
    }

    const serverMessage = typeof err.error === 'string' ? err.error : err.error?.message;
    if (err.status === 401) {
      return serverMessage
        ? `Giriş başarısız: ${serverMessage}`
        : 'Giriş başarısız: kullanıcı adı, e-posta veya parola hatalı.';
    }
    if (err.status === 403) {
      return serverMessage
        ? `Giriş başarısız: ${serverMessage}`
        : 'Giriş başarısız: bu hesapla oturum açma yetkiniz yok.';
    }
    if (serverMessage) {
      return `Giriş başarısız (${err.status}): ${serverMessage}`;
    }
    return `Giriş başarısız. Sunucu ${err.status} durum kodu döndü, açıklama gelmedi.`;
  }

  /** Page the guard redirected from; only in-app paths are accepted. */
  private returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url?.startsWith('/') && !url.startsWith('//') ? url : '/dashboard';
  }
}
