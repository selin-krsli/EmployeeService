# Employee Client — Mülakat Soru Bankası

Bu doküman, `src/employee-client` (Angular SPA, PosCube HR paneli) kod tabanına dayalıdır.  
Sorular **temelden ileri seviyeye** sıralanmıştır. Her bölümde önce kavram, sonra bu projede nasıl kullanıldığı sorulur.

**Önerilen kullanım:** Junior için 1–5, Mid için 1–8, Senior için tamamı + “Tasarım tartışması”.  
API tarafı için bkz. `docs/employee-api-mulakat-sorulari.md` — adaydan **frontend ↔ backend** tutarlılığını da sorun.

---

## Uygulamaya hızlı bakış (mülakatçı için)

| Konu | Bu projede |
|------|------------|
| Framework | Angular **21** (standalone, NgModule yok) |
| Dil | TypeScript ~5.9 |
| UI | Bootstrap 5 (kısmi SCSS), Bootstrap Icons subset, SweetAlert2 |
| HTTP | `provideHttpClient(withFetch(), withInterceptors(...))` |
| Form | Reactive Forms (`NonNullableFormBuilder`) |
| State | NgRx/signals store **yok**; component state + RxJS `Subject` |
| Auth | JWT Bearer, `localStorage`, client-side JWT decode |
| Yetki (UI) | Rol tabanlı (`Admin` / `Viewer`); permission matrisi salt okunur |
| Routing | Lazy `loadComponent` + functional guards |
| Zone | `zone.js` bağımlılığı yok (zoneless uyumlu) |
| Test | Vitest yapılandırılmış; **`.spec.ts` yok** |
| API | `environment.apiUrl` (dev: `https://localhost:7137/api`, docker/prod: `http://localhost:5001/api`) |

**Klasör özeti:** `core/` (auth, models, services) · `features/` (ekranlar) · `layout/` · `shared/`

---

# 1. Temel Angular / TypeScript kavramları

### 1.1. Angular nedir? SPA ne demek?

**Beklenen:** Single Page Application; tarayıcıda çalışan client, API ile JSON konuşur. Bu proje `employee-api`’ye HTTP atar.

### 1.2. Standalone component nedir? NgModule’den farkı?

**Beklenen:** Component kendi `imports` dizisini taşır; `NgModule` declarations gerekmez. Bu projede **tüm component’ler standalone**; `bootstrapApplication(App, appConfig)`.

### 1.3. `inject()` ile constructor DI farkı nedir?

**Beklenen:** `inject()` functional context / field initializer’da kullanılır; guard/interceptor’da zorunlu pattern. Component’lerde de yaygın (`AuthService`, `HttpClient`).

### 1.4. Template-driven vs Reactive Forms — bu proje hangisini kullanıyor?

**Beklenen:** Reactive Forms. `NonNullableFormBuilder`, `Validators`, `FormArray` (adresler).

### 1.5. `Observable` nedir? Promise’den farkı?

**Beklenen:** Lazy, iptal edilebilir, çok değer. HTTP çağrıları Observable; listelerde `switchMap` ile önceki istek iptal edilir.

### 1.6. `ChangeDetectionStrategy.OnPush` ne kazandırır?

**Beklenen:** Input referansı / event / async pipe değişmedikçe CD atlanır. Bu projede listeler/modallar OnPush; async sonrası `cdr.markForCheck()`.

### 1.7. `providedIn: 'root'` ne anlama gelir?

**Beklenen:** Singleton servis; tree-shakable. Tüm `*Service` ve `AuthService` böyle.

### 1.8. TypeScript `as const` + type türetme (`AppRole`) ne işe yarar?

**Beklenen:**
```ts
export const AppRole = { Admin: 'Admin', Viewer: 'Viewer' } as const;
export type AppRole = (typeof AppRole)[keyof typeof AppRole];
```
Literal union type; magic string azaltır.

### 1.9. Pipe nedir? Bu projede örnek?

**Beklenen:** Template dönüşümü. `InitialsPipe` — employee kartında. Header kendi `initials` getter’ını kullanır (pipe zorunlu değil).

### 1.10. Structural directive nedir? `*hasRole` nasıl çalışır?

**Beklenen:** DOM’a ekler/çıkarır (`*ngIf` gibi). `HasRoleDirective` `TemplateRef` + `ViewContainerRef`; yetki yoksa template render edilmez (veya `else`).

---

# 2. Proje yapısı ve mimari

### 2.1. `core` / `features` / `layout` / `shared` ayrımı neden?

**Beklenen:**
- **core:** auth, HTTP servisler, modeller (feature-agnostic)
- **features:** ekranlar (employees, users, …)
- **layout:** shell (sidebar, header, main-layout)
- **shared:** modal, directive, pipe

### 2.2. Root `App` component ne yapıyor?

**Beklenen:** Sadece `<router-outlet />` — shell layout route child’ında.

### 2.3. Barrel export (`index.ts`) avantaj/dezavantaj?

**Beklenen:** `import { AuthService } from './core/auth'` kısalır; circular dependency riski artabilir.

### 2.4. Lazy loading bu projede nasıl?

**Beklenen:** `loadComponent: () => import('...').then(m => m.EmployeeList)` — route bazlı code split.

### 2.5. Feature module yok — “modül” kelimesi ne anlama geliyor burada?

**Beklenen:** Klasör/feature sınırları; Angular `NgModule` değil. Backend’deki permission `module` (employees, departments) ile karıştırılmamalı.

---

# 3. Routing ve guard’lar

### 3.1. `authGuard` / `guestGuard` / `roleGuard` görevleri?

| Guard | Davranış |
|-------|----------|
| `authGuard` | Token yok/expired → `/login` (+ `returnUrl`) |
| `guestGuard` | Token var → `/dashboard` (login’e girme) |
| `roleGuard` | `data.roles` yoksa veya `hasRole` → true; değilse `/dashboard` |

### 3.2. Functional guard (`CanActivateFn`) vs class-based guard?

**Beklenen:** Modern Angular tercihi; `inject()` ile DI. Bu projede class guard yok.

### 3.3. `/users` ve `/roles` neden ekstra guard?

**Beklenen:** Admin only: `canActivate: [roleGuard], data: { roles: [AppRole.Admin] }`. Parent zaten `authGuard`.

### 3.4. Yetkisiz kullanıcı `/users` yazarsa ne olur?

**Beklenen:** `roleGuard` → `/dashboard` (özel 403 sayfası yok).

### 3.5. `returnUrl` open redirect riski nasıl azaltılmış?

**Beklenen:** `loginReturnQuery` — `/`, `/login`, `/dashboard` için query yok. Login `ngOnInit` geçersiz `returnUrl`’i temizler. (Tam URL whitelist’i sınırlı; `http://evil.com` tipik path kontrolü ile engellenir eğer sadece relative path kabul ediliyorsa — adaya `navigateByUrl(returnUrl)` güvenliğini sordurun.)

### 3.6. Wildcard `**` ne yapıyor?

**Beklenen:** Bilinmeyen path → `''` → dashboard redirect zinciri.

### 3.7. Route `title` ne işe yarar?

**Beklenen:** Tarayıcı sekme başlığı (`Giriş Yap`, `Personel Listesi`, …).

### 3.8. Child route’larda `MainLayout` neden `component` (lazy değil)?

**Beklenen:** Shell her authenticated sayfada gerekli; children lazy. Trade-off: layout her zaman ana bundle’da.

---

# 4. Authentication (JWT, storage, interceptor)

### 4.1. Login akışını adım adım anlat.

1. Form: `login` + `password` → API’ye `{ userName, password }`
2. `POST /auth/login` → `AuthResponse`
3. `setToken(accessToken)` → localStorage + decode + expiry timer
4. `navigateByUrl(returnUrl)` (`replaceUrl: true`)

### 4.2. Token nerede saklanıyor? Key adı?

**Beklenen:** `localStorage` → `employee-service.access-token`.

### 4.3. `localStorage` vs `sessionStorage` vs memory vs httpOnly cookie?

**Beklenen:** localStorage XSS’e açık, sekmeler arası kalıcı. httpOnly cookie CSRF/CORS trade-off. Bu proje localStorage.

### 4.4. `AuthResponse.user` neden kullanılmıyor?

**Beklenen:** Kimlik JWT payload’dan (`decodeToken`) üretiliyor; tek kaynak token. Header’daki isim/roller claim’den gelir.

### 4.5. JWT client’ta decode etmek güvenli mi? İmza doğrulanıyor mu?

**Beklenen:** **Hayır, imza doğrulanmaz** — sadece base64 parse. Güvenlik API’de; client UI için convenience. Sahte token ile UI açılabilir ama API 401 verir.

### 4.6. Hangi claim’ler `AuthUser`’a map ediliyor?

**Beklenen:** `sub`→id, `unique_name`→userName, `name`, `email`, `role` (string|array→flat), `exp`→expiresAt (ms).

### 4.7. Permission claim’leri (`employees.read`) client’ta kullanılıyor mu?

**Beklenen:** **Hayır.** UI rol (`Admin`/`Viewer`) ile; permission matrisi roller ekranında salt okunur gösterim.

### 4.8. `scheduleExpiry` / `setTimeout` overflow koruması nedir?

**Beklenen:** `Math.min(delay, 2_147_483_647)` — ~24.8 gün üstü setTimeout taşması.

### 4.9. Interceptor ne yapar? Login 401’de neden logout yok?

**Beklenen:** `apiUrl` ile başlayan isteklere Bearer ekler. 401 + URL `/auth/login` değilse `logout`. Login 401 = yanlış şifre; kullanıcıyı tekrar login’e “atmak” anlamsız/loop riski.

### 4.10. Interceptor neden tüm URL’lere değil sadece `environment.apiUrl`’e token ekler?

**Beklenen:** Harici CDN/asset isteklerine yanlışlıkla Authorization gitmesin.

### 4.11. Refresh token var mı?

**Beklenen:** Yok. Expiry timer + 401 → logout.

### 4.12. Uygulama açılışında token nasıl yüklenir?

**Beklenen:** `AuthService` constructor → `localStorage.getItem` → `setToken` (expired ise siler).

### 4.13. Login’de demo credentials neden form default’unda?

**Beklenen:** Case/demo kolaylığı (`admin` / `Admin123!`). Production’da kaldırılmalı — güvenlik sorusu.

### 4.14. HTTP status 0 mesajında `environment.apiUrl` gösterilmesi — artı/eksi?

**Beklenen:** Ops debug kolay; production’da bilgi sızıntısı / kullanıcı karmaşası.

---

# 5. Authorization (UI vs API)

### 5.1. UI’da rol kontrolü yeterli mi?

**Beklenen:** **Hayır.** Directive/guard sadece UX. Asıl yetki API `[Authorize]` / `[HasPermission]`. Directive yorumu bunu söylüyor.

### 5.2. Backend permission-based, frontend role-based — tutarsızlık?

**Beklenen:** Viewer API’de sadece read permission; UI’da mutasyon butonları `*hasRole="'Admin'"`. İkisi hizalı varsayılmış; yeni rol eklenince UI güncellenmeli.

### 5.3. `HasRoleDirective` neden `ngDoCheck` kullanıyor?

**Beklenen:** Auth state signal/observable değil; rol değişimini (login/logout) yakalamak için. Maliyet: her CD döngüsünde key karşılaştırma.

### 5.4. Sidebar Admin menüyü nasıl gizliyor?

**Beklenen:** `NAV_ENTRIES` içinde `roles: [AppRole.Admin]`; `auth.hasRole` ile filtre.

### 5.5. Viewer URL’ye `/roles` yazarsa?

**Beklenen:** Guard dashboard’a; menüde zaten yok.

### 5.6. Rol izin matrisi (`ModulePermission`) neden düzenlenemiyor?

**Beklenen:** API’de rol CRUD/permission update yok; client `RoleService` sadece GET. Modal salt okunur.

---

# 6. HTTP servisleri ve API entegrasyonu

### 6.1. Thin service pattern nedir? Örnek?

**Beklenen:** `EmployeeService.getPage(...)` → `HttpClient.get` + query params; iş kuralı component’te/UI’da.

### 6.2. `PagedResult` alanları?

**Beklenen:** `items`, `page`, `pageSize`, `totalCount`. `PAGE_SIZE = 5` (API default ile uyumlu).

### 6.3. Employee listesinde `isActive` nasıl gönderiliyor?

**Beklenen:** `showActive` boolean → paged query `isActive`.

### 6.4. `withFetch()` ne demek? XHR’dan farkı?

**Beklenen:** HttpClient altında Fetch API. Progress event vb. farkları; modern tarayıcı varsayılanı.

### 6.5. Proxy (`proxy.conf.json`) neden yok?

**Beklenen:** Tarayıcı doğrudan API host’una gider → **CORS** API’de (`AngularDev` → `localhost:4200`). Docker’da da aynı model (`localhost:5001`).

### 6.6. Environment fileReplacement ne işe yarar?

**Beklenen:** `ng serve` → `environment.development.ts` (HTTPS 7137). Docker config → `environment.docker.ts`. Production build → `environment.ts`.

### 6.7. User create hangi endpoint?

**Beklenen:** `POST /auth/register` (`UserService`) — UsersController create değil.

### 6.8. Password change endpoint?

**Beklenen:** `PUT /users/{id}/change-password`.

### 6.9. Update yanıtı `{ success: true }` — UI ne yapar?

**Beklenen:** HTTP success yeterli; listeyi yeniden yükler / modal kapatır. Body’den entity beklemez.

### 6.10. Hata mesajı sözleşmesi?

**Beklenen:** `error.error.message`; password modal’da `field` (`CurrentPassword`, `NewPassword`) → `setErrors({ server })`.

---

# 7. Reactive Forms ve feature ekranları

### 7.1. `markAllAsTouched` + `isInvalid` pattern’i neden?

**Beklenen:** Submit’te tüm hataları göster; sadece touched/dirty alanlarda kırmızı border.

### 7.2. Employee form’da TC ve telefon kuralları?

**Beklenen:** TC `^\d{11}$`. TR mobil custom validator; canonical `05XXXXXXXXX` (API ile uyumlu normalize).

### 7.3. Adres `FormArray` kuralları client’ta neler?

**Beklenen:** Max 2; Home/Work tekil; duplicate tip engeli. API de aynı kuralı enforce eder.

### 7.4. `addressRevision` OnPush’ta neden var?

**Beklenen:** FormArray iç state değişince getter’ların (`canAddAddress`) template’i yenilemesi için manuel revision / markForCheck tetikleyicisi.

### 7.5. Readonly form modu nasıl?

**Beklenen:** `form.disable()`; boş değerler UI’da `"-"`.

### 7.6. User form create vs edit farkları?

**Beklenen:** Create: employee picker + password + role. Edit: employee disabled; şifre ayrı modal. System user (admin/viewer employee’siz) picker gizli.

### 7.7. Username önerisi nasıl üretiliyor?

**Beklenen:** Employee email local-part’ten `suggestUserName`.

### 7.8. Create user’da employee dropdown neden `getAll` kullanıyor?

**Beklenen:** Sayfalı listede tüm personel görünmez; seçim için tam liste.

### 7.9. Modal pattern: `*ngIf` + `(saved)` / `(closed)`?

**Beklenen:** Mount/unmount ile state sıfırlama; parent orchestration.

### 7.10. SweetAlert2 ile custom `Modal` neden birlikte?

**Beklenen:** Confirm/delete toast → Swal; form dialog → shared Modal (Bootstrap görünümlü, JS dependency’siz).

### 7.11. Shared Modal’da Bootstrap JS yok — nasıl kapanıyor?

**Beklenen:** Escape, overlay click, `body.modal-open` class; Angular event binding.

### 7.12. Floating action menu (employee list) UX detayları?

**Beklenen:** `position: fixed`, scroll/resize’da kapanır, viewport’a göre yukarı açılabilir.

---

# 8. RxJS ve state yönetimi

### 8.1. Liste ekranında `search$` + `load$` akışını çiz.

```
search$ → debounceTime(300) → distinctUntilChanged → page=1 → load$.next()
load$ → switchMap(HTTP) → subscribe → employees/totalCount
```

### 8.2. Neden `switchMap` `mergeMap` değil?

**Beklenen:** Yeni arama/sayfa eski isteği iptal eder; race condition ve yanlış sonuç yazımını önler.

### 8.3. `debounceTime(300)` ne kazandırır?

**Beklenen:** Her tuşta HTTP atmaz; 300ms sessizlik sonrası arar.

### 8.4. `takeUntilDestroyed` / `DestroyRef` ne yapar?

**Beklenen:** Component destroy’da subscription otomatik unsubscribe — memory leak önleme.

### 8.5. Boş sayfa + `page > 1` neden `page -= 1`?

**Beklenen:** Son kaydı silince boş sayfada kalmamak; otomatik önceki sayfaya düş.

### 8.6. Dashboard neden `forkJoin(getAll, getAll)` kullanıyor?

**Beklenen:** KPI’ları client’ta aggregate (aktif/pasif, pie, recent). **Ölçek sorunu:** binlerce personelde ağır.

### 8.7. `BehaviorSubject` vs `Subject` dashboard’da?

**Beklenen:** `refresh$` BehaviorSubject — subscribe anında hemen tetiklenir (`undefined` seed).

### 8.8. Auth state neden reactive (BehaviorSubject/signal) değil?

**Beklenen:** Sync getter (`currentUser`, `getToken`). Guard anlık okur; directive DoCheck ile izler. Trade-off: template’de async pipe ile auth zor.

### 8.9. Angular Signals bu projede var mı?

**Beklenen:** Kullanılmıyor. Modern alternatif tartışması: `signal` + `computed` + `effect`.

### 8.10. Global state (NgRx) bu boyutta gerekli mi?

**Beklenen:** Genelde hayır; feature local state yeterli. Cross-feature cache gerekirse düşünülür.

---

# 9. Dashboard ve görselleştirme

### 9.1. Pasta grafik nasıl çiziliyor?

**Beklenen:** SVG path hesaplama (client-side); harici chart kütüphanesi yok.

### 9.2. `departmentColor(id, name)` mantığı?

**Beklenen:** Id’ye göre palette + özel isim override (ör. İnsan Kaynakları).

### 9.3. “Bu ay işe girenler” nasıl hesaplanıyor?

**Beklenen:** `hireDate.startsWith(currentMonthPrefix)` — string prefix (ISO date).

### 9.4. Recent employees sıralaması?

**Beklenen:** Aktifler, `createdAt` desc, slice 8.

---

# 10. Layout ve UX

### 10.1. MainLayout mobil davranışı?

**Beklenen:** ~991.98px breakpoint; sidebar overlay; navigate’de kapanma event’i.

### 10.2. Header kullanıcı bilgisini nereden alır?

**Beklenen:** JWT decode (`AuthService.currentUser`). Profil modal için `/auth/me` ile zenginleştirme (UserFormModal readonly).

### 10.3. JWT display name ile `/auth/me` farkı ne zaman sorun olur?

**Beklenen:** Claim stale; employee adı değişince token yenilenene kadar eski `name` kalır. `/auth/me` güncel DTO döner.

### 10.4. Sidebar accordion nasıl açılıyor?

**Beklenen:** `NavigationEnd` → aktif child’a göre grup açık.

### 10.5. User list `?view=id` query ne işe yarar?

**Beklenen:** Deep link ile readonly user modal açma.

---

# 11. Build, Docker, kalite

### 11.1. `ng serve` vs production build farkı?

**Beklenen:** Dev fileReplacement + HMR; prod optimize/minify, `environment.ts`.

### 11.2. Docker client container ne çalıştırıyor?

**Beklenen:** Node 22 + `ng serve --host 0.0.0.0 --port 4200 --configuration docker --poll 2000` (nginx static prod image değil).

### 11.3. Bundle budget (`angular.json`) neden önemli?

**Beklenen:** Bootstrap cherry-pick + icon subset ile 500kB uyarısını kontrol.

### 11.4. Test yokken Vitest neden package’te?

**Beklenen:** Scaffold hazır; coverage sıfır — CI’da boş güvenlik ağı.

### 11.5. Prettier rolü?

**Beklenen:** Format consistency (`.prettierrc`).

---

# 12. Senaryo / kod okuma soruları

### 12.1. Viewer login sonrası sidebar’da “Ayarlar” görünür mü?

**Beklenen:** Hayır (`roles: Admin`).

### 12.2. Viewer personel silemez — UI ve API’de nasıl engellenir?

**Beklenen:** UI: `*hasRole="AppRole.Admin"`. API: `employees.delete` permission yok → 403.

### 12.3. Token expire olduktan 1 sn sonra protected route?

**Beklenen:** `getToken()` null → authGuard login’e. Veya açık sayfadayken timer logout.

### 12.4. API down iken login — kullanıcı ne görür?

**Beklenen:** status 0 mesajı + `apiUrl` ipucu.

### 12.5. Aynı anda hızlı arama yazınca kaç HTTP tamamlanır?

**Beklenen:** `switchMap` sayesinde pratikte son debounce sonrası bir sonuç uygulanır; ara istekler iptal.

### 12.6. Son personeli silince sayfa boş kalır mı?

**Beklenen:** Hayır; `page > 1` ve items boşsa page-- reload.

### 12.7. Sahte JWT localStorage’a yazılırsa dashboard açılır mı?

**Beklenen:** Decode + exp geçerli görünüyorsa UI açılabilir; API çağrıları 401 → interceptor logout. (İmza yok.)

### 12.8. Login başarılı, `AuthResponse.expiresAt` ile JWT `exp` çelişirse?

**Beklenen:** Client `exp` claim kullanır; response `expiresAt` ignore.

### 12.9. Employee form’da iki Home adresi eklenmeye çalışılırsa?

**Beklenen:** Client engeller; API de 400 `AppException` döner.

### 12.10. Admin olmayan biri DevTools’tan UserService.register çağırırsa?

**Beklenen:** API anonymous register açık (backend konusu); Admin rolü kısıtlı. Frontend guard sadece route’u korur — kritik güvenlik API’de.

---

# 13. Frontend ↔ Backend çapraz sorular

1. Client `PAGE_SIZE = 5` ile API `PageRequest.DefaultPageSize = 5` — bilinçli mi?
2. Client rol bazlı gizler; API permission claim ister — yeni “Editor” rolü eklemek için iki tarafta ne değişir?
3. Employee e-posta güncellemesi: client form → API `SyncLinkedUserEmail` — header’daki JWT email ne zaman güncellenir? (yeniden login)
4. CORS: client proxy’siz; API `WithOrigins("http://localhost:4200")` — production domain eklemek gerekir mi?
5. Docker: tarayıcı `localhost:5001` görür, container network adı değil — neden?
6. API `JsonStringEnumConverter` + client `AddressType = 'Home' | 'Work'` — int gönderilirse ne olur?
7. Soft delete yok: client “pasif” filtresi `isActive` — silinen kayıt listeden nasıl kaybolur?

---

# 14. Tasarım tartışması (Senior)

1. Auth state’i `signal` / `BehaviorSubject` yapsan directive’teki `ngDoCheck` kalkar mı?
2. Permission-based UI (`*hasPermission="'employees.delete'"`) nasıl tasarlanır? JWT’ye permission eklemek yeterli mi?
3. Dashboard için `/api/dashboard/summary` endpoint’i vs client aggregate?
4. Refresh token + silent renew olmadan UX nasıl iyileştirilir? (uyarı bandı, kısa TTL)
5. httpOnly cookie + BFF pattern bu case için overkill mi?
6. OnPush + zoneless’te `markForCheck` unutulursa ne olur? Nasıl test edilir?
7. FormArray adres sync ile API `SyncAddresses` çift validation — single source of truth nerede olmalı?
8. Micro-frontend / monorepo’ya bölünse core auth nasıl share edilir?
9. i18n eklemek için hangi katmanlar değişir?
10. E2E (Playwright) ile kritik path: login → employee create → list assert.
11. XSS: SweetAlert HTML / kullanıcı adını template’e basarken nelere dikkat?
12. Bundle: Bootstrap’ı tamamen bırakıp utility CSS’e geçmenin trade-off’u?

---

# 15. Kısa “doğru / yanlış” turu

| # | İfade | Doğru mu? |
|---|--------|-----------|
| 1 | Proje NgModule tabanlıdır | **Yanlış** (standalone) |
| 2 | NgRx kullanılır | **Yanlış** |
| 3 | Token `sessionStorage`’da | **Yanlış** (localStorage) |
| 4 | JWT imzası client’ta doğrulanır | **Yanlış** |
| 5 | UI permission claim’e göre buton gizler | **Yanlış** (role) |
| 6 | `/users` için `roleGuard` var | **Doğru** |
| 7 | Interceptor login 401’de logout yapar | **Yanlış** |
| 8 | Listelerde arama `switchMap` + debounce | **Doğru** |
| 9 | Dashboard paged API kullanır | **Yanlış** (`getAll`) |
| 10 | `zone.js` package bağımlılığı var | **Yanlış** |
| 11 | Role permissions modal’dan güncellenir | **Yanlış** (salt okunur) |
| 12 | Lazy `loadComponent` kullanılıyor | **Doğru** |

---

# 16. Mülakatçı skor kartı

| Seviye | Minimum beklenen |
|--------|------------------|
| **Junior** | Standalone/component, routing, reactive form, HTTP service, JWT’nin ne olduğu, localStorage |
| **Mid** | Functional guard/interceptor, OnPush + markForCheck, switchMap/debounce, *hasRole vs API auth, environment/CORS |
| **Senior** | Client-side JWT decode güvenliği, stale claims, DoCheck maliyeti, dashboard ölçeği, refresh token yokluğu, FE/BE yetki modeli hizası |

---

# 17. Dosya haritası (soru sırasında referans)

| Konu | Dosya |
|------|--------|
| Route ağacı | `src/app/app.routes.ts` |
| Providers / HTTP | `src/app/app.config.ts` |
| Auth servis + JWT decode | `src/app/core/auth/auth.service.ts` |
| Guards | `src/app/core/auth/auth.guards.ts` |
| Interceptor | `src/app/core/auth/auth.interceptor.ts` |
| HasRole | `src/app/shared/directives/has-role.directive.ts` |
| Employee liste RxJS | `src/app/features/employees/employee-list/employee-list.ts` |
| Employee form | `src/app/features/employees/employee-form-modal/employee-form-modal.ts` |
| Login | `src/app/features/auth/login/login.ts` |
| Dashboard | `src/app/features/dashboard/dashboard.ts` |
| Sidebar nav | `src/app/layout/sidebar/sidebar.ts` |
| Modeller | `src/app/core/models/*.ts` |
| API servisleri | `src/app/core/services/*.ts` |
| Environments | `src/environments/*.ts` |

---

*Doküman, PosCubeCase `employee-client` kodunun mevcut haline göre hazırlanmıştır. Kod değiştikçe cevap anahtarlarını güncelleyin.*
