# Employee API — Mülakat Soru Bankası

Bu doküman, `src/employee-api` (proje adı: **EmployeeService**, .NET 9) kod tabanına dayalıdır.  
Sorular **temelden ileri seviyeye** sıralanmıştır. Her bölümde önce kavram, sonra bu projede nasıl kullanıldığı sorulur.

**Önerilen kullanım:** Adayın seviyesine göre bölüm seçin. Junior için 1–5, Mid için 1–8, Senior için tamamı + “Tasarım tartışması”.

---

## Servise hızlı bakış (mülakatçı için)

| Konu | Bu projede |
|------|------------|
| Framework | ASP.NET Core Web API, .NET 9 |
| ORM | EF Core 9 + SQL Server |
| Kimlik | Custom JWT (ASP.NET Identity değil; yalnızca `PasswordHasher<User>`) |
| Yetki | Claim tabanlı permission (`employees.read` vb.) + `HasPermissionAttribute` |
| Mapping | AutoMapper (`ProjectTo` okuma, `Map` yazma) |
| Katmanlar | Controller → Service → `AppDbContext` |
| PK | Pratikte `int` identity; `Entity<Guid>` altyapısı hazır ama kullanılmıyor |
| Soft delete | Yok; `IsActive` + hard delete |
| Audit | `CreatedAt` / `UpdatedAt` (`SaveChanges` override) |

**Ana domain:** Employee, Address, Department, User, Role, UserRole, RoleClaim

---

# 1. Temel .NET / C# kavramları

### 1.1. `Guid` nedir? Ne işe yarar?

**Beklenen:** Globally Unique Identifier; 128-bit benzersiz kimlik. Dağıtık sistemlerde çakışma riski düşük ID üretimi.

**Takip:** `Guid.NewGuid()` ile `SequentialGuid` farkı nedir?

### 1.2. Bu projede GUID nerede kullanılıyor?

**Cevap ipucu:**
- `Entity<TId>` constructor’ında: `TId == Guid` ise `SequentialGuidValueGenerator` ile Id atanır.
- `EmployeeService.GenerateEmployeeNumber()`: `EMP-{Guid.NewGuid()...5 hex}`.
- JWT’de `jti` claim’i: `Guid.NewGuid()`.
- Domain PK’ler şu an `Entity<int>` — GUID primary key **kullanılmıyor**.

### 1.3. Neden SQL Server’da rastgele GUID clustered primary key sorun yaratabilir?

**Beklenen:** Random GUID insert’leri index sayfalarında page split / fragmentation artırır. Sequential GUID bunu azaltır. Projede yorum satırı bunu açıkça anlatıyor.

### 1.4. `int` identity vs `Guid` PK — ne zaman hangisi?

**Beklenen:** int daha küçük, sıralı, okunabilir; Guid merge/offline/client-side generation için avantajlı. Bu projede `Entity<Guid>` hazır bırakılmış, entity’ler `Entity<int>`.

### 1.5. `DateOnly` nedir? `DateTime`’dan farkı?

**Beklenen:** Sadece tarih (saat yok). `Employee.DateOfBirth`, `HireDate` için kullanılmış.

### 1.6. `enum` veritabanında nasıl saklanır? Bu projede `AddressType` nasıl?

**Beklenen:** Default int veya string conversion. Burada Fluent API: `.HasConversion<string>()`. API tarafında `JsonStringEnumConverter` ile JSON’da string (`"Home"` / `"Work"`).

### 1.7. Nullable referans tipleri (`string?`, `Employee?`) ne sağlar?

**Beklenen:** Derleme zamanı null güvenliği. Örn. `User.EmployeeId` nullable; admin/viewer seed’de employee yok.

### 1.8. `ICollection<T>` navigation property neden kullanılır?

**Beklenen:** EF ilişkileri (1-N). `Employee.Addresses`, `User.UserRoles` vb.

### 1.9. Interface vs abstract class — `IEntity<TId>`, `IAuditableEntity`, `Entity<TId>` ayrımı neden?

**Beklenen:**
- `IAuditableEntity`: generic olmayan audit görünümü → `ChangeTracker.Entries<IAuditableEntity>()`.
- `IEntity<TId>`: Id + audit.
- `Entity<TId>`: ortak implementasyon + Guid generator.

### 1.10. `notnull` generic constraint ne anlama gelir?

**Beklenen:** `TId : notnull` — Id null olamaz (referans veya nullable value type değil).

---

# 2. Domain modelleri (Entity katmanı)

### 2.1. `Entity<TId>` hangi alanları taşır?

**Cevap:** `Id`, `CreatedAt`, `UpdatedAt`.

### 2.2. `UserRole` neden `Entity`’den türemiyor?

**Beklenen:** Composite key `(UserId, RoleId)`; audit alanı yok; junction/join tablosu.

### 2.3. `Employee` ile `User` ilişkisi nedir? Kardinalite?

**Beklenen:** User → Employee opsiyonel FK (`EmployeeId?`). Bir employee’ye en fazla bir user (unique index). Seed admin/viewer’da `EmployeeId = null`.

### 2.4. Employee silinince User’a ne olur? Address’e ne olur?

**Beklenen (Fluent API):**
- Address → Employee: **Cascade**
- User → Employee: **SetNull**
- Ama servis: bağlı user varsa silmeye izin vermez (`409`) — DB SetNull’a düşmeden önce iş kuralı.

### 2.5. Department silinince Employee’ye ne olur?

**Beklenen:** `OnDelete(DeleteBehavior.Restrict)` — FK engeller. Serviste de personeli olan birim silinemez (`409`).

### 2.6. Soft delete bu projede var mı? `IsActive` soft delete midir?

**Beklenen:** Soft delete yok (IsDeleted yok). `IsActive` pasifleştirme; `Delete` fiziksel `Remove()`.

### 2.7. Unique index’ler hangileri? Neden?

**Örnekler:** `EmployeeNumber`, `IdentityNumber`, `Department.Name`, `User.UserName`, `User.Email`, `User.EmployeeId`, `Role.Name`, `RoleClaim (RoleId, ClaimType, ClaimValue)`.

### 2.8. `Address` için iş kuralları neler?

**Beklenen:** En fazla 2 adres; Home ve Work tekil (`EnsureValidAddresses`). Ülke default `"Turkey"`.

### 2.9. `RoleClaim` ne tutar? ClaimType / ClaimValue örneği?

**Beklenen:** `ClaimType = "permission"`, `ClaimValue = "employees.read"` gibi.

### 2.10. Navigation property’lerde `= null!` ne anlama gelir?

**Beklenen:** EF tarafından doldurulacağı için null-forgiving; derleyici uyarısını bastırma.

---

# 3. Auditing ve DbContext

### 3.1. `CreatedAt` / `UpdatedAt` kim set ediyor?

**Beklenen:** `AppDbContext.ApplyAuditTimestamps()` — `SaveChanges` / `SaveChangesAsync` override.

### 3.2. Neden `ChangeTracker.DetectChanges()` çağrılıyor?

**Beklenen:** Property değişiklikleri lazy detect edilir; çağrılmazsa Modified state kaçırılabilir.

### 3.3. Modified entity’de `CreatedAt.IsModified = false` neden?

**Beklenen:** Client/mapper yanlışlıkla CreatedAt’i değiştirmesin; orijinal oluşturma zamanı korunsun.

### 3.4. Yorum “UTC” diyor, kod `DateTime.Now` kullanıyor. Sorun mu?

**Beklenen:** Tutarsızlık. Production’da timezone / sunucu saati farkı; ideal `DateTime.UtcNow` veya `DateTimeOffset`.

### 3.5. Neden hem `SaveChanges` hem `SaveChangesAsync` override edilmeli?

**Beklenen:** Parametresiz overload’lar `acceptAllChangesOnSuccess` versiyonuna delege eder; ikisini de override etmek güvenli kapsama sağlar.

### 3.6. Seed verisinde `CreatedAt` neden sabit `SeedTimestamp`?

**Beklenen:** Migration `HasData` deterministik olmalı; her build’de değişen `UtcNow` migration farkı üretir.

### 3.7. `OnModelCreating`’de Fluent API ile Data Annotations farkı?

**Beklenen:** Fluent merkezi, daha güçlü (composite key, delete behavior, conversion). Bu projede ağırlık Fluent’te; DTO’larda DataAnnotations.

### 3.8. Migration ne işe yarar? Bu projede ne zaman uygulanır?

**Beklenen:** Şema versiyonlama. `DbSeeder.SeedAsync` içinde `MigrateAsync()` (Development veya `SeedOnStartup`).

### 3.9. Seed başarısız olursa API neden ayakta kalıyor?

**Beklenen:** `Program.cs` try/catch — loglar, `RunAsync` devam eder. Trade-off: boş/eski DB ile ayakta API.

### 3.10. `HasData` ile `DbSeeder` ayrımı neden?

**Beklenen:** Roller/izinler migration ile; demo department/employee/user runtime seeder ile (şifre hash’i için `PasswordHasher` gerekir).

---

# 4. DTO ve AutoMapper

### 4.1. Entity’yi doğrudan API’de dönmek neden kötü?

**Beklenen:** Over-posting, sızıntı (PasswordHash), coupling, circular JSON (navigation).

### 4.2. Create / Update / List DTO ayrımı neden?

**Beklenen:** Farklı alan setleri; Id client’tan gelmemeli; update’te EmployeeNumber ignore.

### 4.3. AutoMapper `ProjectTo` ile `Map` farkı?

**Beklenen:** `ProjectTo` IQueryable üzerinde SQL’e çevrilir (tek sorgu). `Map` bellekte, entity yüklü olmalı.

### 4.4. Neden okumada `AsNoTracking()` + `ProjectTo`?

**Beklenen:** Tracking overhead yok; salt okuma performansı.

### 4.5. `EmployeeUpdateDto → Employee` map’te `Addresses` neden Ignore?

**Beklenen:** Adresler `SyncAddresses` ile tip bazlı upsert/silme; kör Map collection’ı bozar.

### 4.6. `AssertConfigurationIsValid()` ne zaman çalışıyor, neden?

**Beklenen:** Startup’ta; ilk request’te değil, erken fail-fast.

### 4.7. `PagedResult` ve `PageRequest.Normalize` ne yapar?

**Beklenen:** Default pageSize 5, max 50; page &lt; 1 → 1.

### 4.8. Telefon normalizasyonu nerede?

**Beklenen:** `EmployeeProfile.NormalizePhone` — 10 hane ise başına `0`.

### 4.9. `UserDto`’da FirstName/LastName/Email employee’den mi geliyor?

**Beklenen:** Mapping’te employee varsa ad/e-posta employee’den; `IsSuperAdmin` sabit admin email ile.

### 4.10. Validation nerede yapılır?

**Beklenen:** DTO DataAnnotations (model binding) + servis kuralları (`AppException`). Global FluentValidation yok.

---

# 5. Service katmanı

### 5.1. Neden Controller’da iş kuralı değil Service’te?

**Beklenen:** Tekrar kullanılabilirlik, test, ince controller (SRP).

### 5.2. Interface (`IEmployeeService`) neden var? DI’da Scoped ne demek?

**Beklenen:** Soyutlama, test mock, birden fazla implementasyon. Scoped = request başına bir instance (DbContext ile uyumlu).

### 5.3. `ITokenService` neden Singleton, `IEmployeeService` neden Scoped?

**Beklenen:** Token servisi stateless + settings; EmployeeService DbContext tutuyor → Scoped olmalı. Singleton service’e Scoped inject etmek anti-pattern.

### 5.4. Proje adı `EmployeeService` iken sınıf da `EmployeeService` — DI kaydı neden `global::`?

**Beklenen:** Namespace/type çakışması; `global::EmployeeService.Services.Implementations.EmployeeService`.

### 5.5. `EmployeeNumber` nasıl üretiliyor? Çakışma riski?

**Beklenen:** GUID’in 5 hex karakteri → küçük uzay; teorik çakışma + unique index → `DbUpdateException` → 409.

### 5.6. İşe giriş yaşı kuralı nedir?

**Beklenen:** `hireDate >= dateOfBirth.AddYears(15)`.

### 5.7. `SyncAddresses` algoritmasını anlat.

**Beklenen:** Mevcut adresleri AddressType dictionary; gelen tip varsa Map (Modified→UpdatedAt); yoksa Add; kalanları RemoveRange.

### 5.8. Personel e-postası değişince User e-postası neden güncellenir?

**Beklenen:** Login email personeli takip eder (`SyncLinkedUserEmailAsync`); hesap IsActive ayrı kalır.

### 5.9. Personel silinirken neden önce User kontrolü var?

**Beklenen:** İş kuralı: önce kullanıcıyı sil. Mesaj: “Bu personele ait kullanıcı bulunmakta…”.

### 5.10. `CancellationToken` neden her metoda geçiliyor?

**Beklenen:** İstek iptalinde DB sorgusunu iptal; kaynak israfını önler.

### 5.11. `AuthService.LoginAsync` null dönerse ne olur? Pasif kullanıcı?

**Beklenen:** null → Controller 401 generic mesaj (user enumeration azaltma). Pasif → `AppException` 403.

### 5.12. `SuccessRehashNeeded` nedir?

**Beklenen:** PasswordHasher algoritma/iterasyon güncellenince login’de otomatik rehash.

### 5.13. Register’da Admin rolü kim verebilir?

**Beklenen:** Caller Admin **veya** sistemde hiç user yoksa (bootstrap). Endpoint `[AllowAnonymous]`.

### 5.14. Register e-postasını client mı gönderir?

**Beklenen:** Hayır; employee kaydındaki email kullanılır.

### 5.15. Süper admin ve “son aktif admin” korumaları neler?

**Beklenen (UserService):** `admin@poscube.com` değiştirilemez/silinemez; son aktif Admin rolü kaldırılmaz/silinmez.

---

# 6. Authentication & Authorization

### 6.1. Authentication ile Authorization farkı?

**Beklenen:** AuthN = kimsin (JWT doğrula); AuthZ = ne yapabilirsin (permission policy).

### 6.2. JWT nedir? Bu projede hangi claim’ler var?

**Beklenen:** `sub` (userId), `unique_name`, `email`, `name`, `jti`, `role` (çoklu), `permission` (çoklu).

### 6.3. `MapInboundClaims = false` neden önemli?

**Beklenen:** Uzun URI claim isimlerine map edilmesin; `User.FindFirst("sub")` / `"role"` çalışsın.

### 6.4. Role-based vs permission-based yetkilendirme?

**Beklenen:** Bu projede permission claim + policy. Rol JWT’de de var ama endpoint’ler çoğunlukla `[HasPermission]`.

### 6.5. `HasPermissionAttribute` nasıl çalışıyor?

**Beklenen:** `AuthorizeAttribute(permission)` — policy adı = permission string. `Program.cs` her permission için `RequireClaim("permission", value)`.

### 6.6. İzinler JWT’ye gömülünce RoleClaims DB’de değişirse ne olur?

**Beklenen:** Token expire olana kadar eski izinler geçerli (stale token). Alternatif: her istekte DB’den yükle veya kısa TTL / refresh / version claim.

### 6.7. `users.create` permission tanımlı ama Register anonymous — sorun mu?

**Beklenen:** Tutarsızlık / güvenlik açığı tartışması. Production’da register’ı kapatmak veya Admin + permission istemek gerekir.

### 6.8. 401 vs 403 bu API’de ne zaman?

**Beklenen:** Token yok/geçersiz → 401; token var permission yok → 403; pasif user login → 403.

### 6.9. HMAC-SHA256 symmetric key JWT’nin riski?

**Beklenen:** Secret sızarsa token forge. Key min 32 char validation (`JwtSettings`). Microservice’te asymmetric (RS256) tercih edilebilir.

### 6.10. `ClockSkew = 1 dakika` ne işe yarar?

**Beklenen:** Sunucu saat farkı toleransı; expire sınırında false reject azaltır.

### 6.11. ASP.NET Identity kullanılmamış; artı/eksi?

**Beklenen:** Artı: hafif, kontrol. Eksi: lockout, 2FA, cookie, role manager hazır değil; her şeyi custom yazıyorsunuz.

### 6.12. Pipeline’da `UseAuthentication` / `UseAuthorization` sırası neden böyle?

**Beklenen:** Önce kimlik set edilmeli, sonra yetki kontrolü. CORS genelde auth’tan önce (preflight).

---

# 7. Controllers & HTTP API

### 7.1. `[ApiController]` ne kazandırır?

**Beklenen:** Automatic 400 validation, binding source inference, ProblemDetails benzeri davranış.

### 7.2. `[Authorize]` sınıf seviyesinde, `[AllowAnonymous]` metotta — nasıl çalışır?

**Beklenen:** AuthController’da login/register anonymous; `me` Authorize. EmployeesController tamamen Authorize + permission.

### 7.3. `CreatedAtAction` ne döner?

**Beklenen:** 201 + Location header. Employee Create → `GetById`; Register → `UsersController.GetById`.

### 7.4. Update başarılı olunca neden entity dönülmüyor?

**Beklenen:** `Ok(new { success = true })` — client’ın yeniden GET etmesi bekleniyor (tasarım tercihi).

### 7.5. Route constraint `{id:int}` ne sağlar?

**Beklenen:** Non-int id → 404 (bu action match etmez), model binding hatası azaltır.

### 7.6. REST açısından DELETE 200 + body vs 204 NoContent?

**Beklenen:** İkisi de geçerli; bu proje mesajlı 200 tercih etmiş.

### 7.7. `RolesController` neden sadece GET?

**Beklenen:** Rol CRUD yok; izinler seed/migration. UI “Yetki Dağılımı” okuma için.

### 7.8. Query’den `isActive` ve `search` nasıl kullanılıyor?

**Beklenen:** Optional filtreler; search EF `Like` ile çok alanda.

### 7.9. Controller’da `CancellationToken` nasıl otomatik gelir?

**Beklenen:** Framework request abort token’ını inject eder.

### 7.10. Thin controller anti-pattern’e düşmemek için ne kontrol edilir?

**Beklenen:** Controller’da business if’leri olmamalı; sadece HTTP mapping (404/201/Ok).

---

# 8. Exception handling & hata modeli

### 8.1. `AppException` ne taşır?

**Beklenen:** `StatusCode`, `Message`, opsiyonel `Field` (hangi form alanı).

### 8.2. Middleware pipeline’ın en başında neden?

**Beklenen:** Alttaki tüm exception’ları yakalasın (Swagger dahil).

### 8.3. `Response.HasStarted` ise neden rethrow?

**Beklenen:** Body yazılmışsa status değiştirilemez; bozulmuş response’u zorlamamak.

### 8.4. `DbUpdateException` → tek 409 mesajı — dezavantaj?

**Beklenen:** Unique violation vs FK vs diğerleri ayrılmaz; kullanıcıya jenerik mesaj. Serviste önceden `AnyAsync` ile daha iyi mesaj verilmeye çalışılmış (race condition kalır).

### 8.5. Validation hatası (DataAnnotations) middleware’e düşer mi?

**Beklenen:** Genelde hayır; `[ApiController]` otomatik 400. Middleware domain/`AppException` için.

### 8.6. 4xx Warning, 5xx Error log — neden?

**Beklenen:** Noise azaltma; gerçek bug’lar Error’da.

---

# 9. EF Core ileri konular

### 9.1. `Include` ne zaman gerekli? `ProjectTo` ile Include gerekir mi?

**Beklenen:** Entity üzerinde navigation kullanacaksan Include. ProjectTo select projection üretir; çoğu zaman Include gerekmez.

### 9.2. Update’te neden `Include(e => e.Addresses)` var?

**Beklenen:** `SyncAddresses` mevcut koleksiyonu change tracker’da bilmeli.

### 9.3. Cascade vs Restrict vs SetNull — örneklerle anlat.

**Beklenen:** Address Cascade; Department Restrict; User.Employee SetNull; UserRole→Role Restrict; UserRole→User Cascade.

### 9.4. Unique index + uygulama kontrolü birlikte neden?

**Beklenen:** Race: iki concurrent create. DB son savunma hattı; uygulama güzel hata mesajı.

### 9.5. N+1 problem nedir? Bu servis nasıl kaçınıyor?

**Beklenen:** ProjectTo / join projection; login’de permissions tek query (RoleClaims + UserRoles).

### 9.6. `RoleService.GetPagedAsync` neden ölçeklenmeyebilir?

**Beklenen:** Tüm rolleri belleğe alıp filtreliyor; DB-side Skip/Take değil (küçük tablo için OK).

### 9.7. Filtered unique index (`EmployeeId` null) SQL Server’da nasıl?

**Beklenen:** Birden fazla NULL unique’e izin (SQL Server); bir employee’ye tek user.

### 9.8. Enum string conversion migration’a nasıl yansır?

**Beklenen:** Kolon nvarchar; değer `"Home"` / `"Work"`.

---

# 10. Program.cs, DI, cross-cutting

### 10.1. Middleware sırasını soldan sağa söyle.

**Beklenen:** ExceptionHandling → Swagger(dev) → Seed → HTTPS → CORS → Authentication → Authorization → Controllers.

### 10.2. CORS neden var? `AngularDev` policy.

**Beklenen:** `http://localhost:4200` frontend. Preflight OPTIONS.

### 10.3. Options pattern: `ValidateOnStart` ne kazandırır?

**Beklenen:** Eksik/kısa JWT secret ile ayakta kalmayı engeller.

### 10.4. `IPasswordHasher<User>` neden Identity paketinden ama full Identity yok?

**Beklenen:** Sadece güvenli hash/verify algoritması reuse.

### 10.5. Swagger’a JWT security scheme eklemenin amacı?

**Beklenen:** Try-out’ta Bearer token yapıştırmak.

### 10.6. `DisableHttpsRedirection` config ne için?

**Beklenen:** Docker/HTTP ortamında HTTPS redirect döngüsü/kırılması önleme.

### 10.7. Multi-stage Dockerfile’ın avantajı?

**Beklenen:** Build image ≠ runtime image; küçük/safer final image.

---

# 11. Senaryo / kod okuma soruları

### 11.1. Yeni personel create akışını adım adım anlat.

1. `[HasPermission(employees.create)]`
2. Model validation
3. `EnsureValidAddresses`, yaş, unique TC
4. Map + `GenerateEmployeeNumber`
5. SaveChanges → CreatedAt stamp
6. `GetById` ProjectTo → 201

### 11.2. Viewer rolü ile DELETE `/api/Employees/1` ne döner?

**Beklenen:** 403 (token var, `employees.delete` yok).

### 11.3. Token olmadan GET `/api/Employees`?

**Beklenen:** 401.

### 11.4. Aynı TC ile iki paralel create — olası sonuçlar?

**Beklenen:** Biri 201; diğeri servis 409 veya DbUpdateException→409.

### 11.5. Employee update’te Home adresini payload’dan çıkarınca ne olur?

**Beklenen:** `SyncAddresses` o tipi Remove eder (hard delete address row).

### 11.6. Login’de username yerine email ile giriş mümkün mü?

**Beklenen:** Evet — `UserName == login || Email == login` (trim + lower).

### 11.7. İlk kurulumda Users boşken anonymous register Admin olabilir mi?

**Beklenen:** Evet (bootstrap). Sonraki Admin register için caller Admin olmalı; anonymous ikinci Admin → 403.

### 11.8. `Auth/me` userId’yi nereden okur?

**Beklenen:** `User.FindFirst(AppClaimTypes.UserId)` → `sub` claim.

### 11.9. Bağlı user’ı olan employee’yi silmeye çalışırsak?

**Beklenen:** 409 AppException; cascade/SetNull’a gelinmez.

### 11.10. Permission’ı RoleClaims’ten silip eski JWT ile istek?

**Beklenen:** Token’daki eski permission ile işlem devam eder (expire’a kadar).

---

# 12. Tasarım tartışması (Senior)

Adaydan **bu kod tabanına** bağlı cevap isteyin.

1. Soft delete ekleseydin hangi tablolara, global query filter nasıl?
2. Permission’ları her request’te DB’den okumak vs JWT’ye gömmek — trade-off?
3. `users.create` ile anonymous register çelişkisini nasıl kapatırsın?
4. `EmployeeNumber` için sıra tablosu / HiLo / DB sequence mi GUID parçası mı?
5. Audit’te `DateTime.Now` → UtcNow veya `DateTimeOffset` migrasyonu planı?
6. `AppException` + middleware yerine Result pattern / ProblemDetails?
7. CQRS veya MediatR bu boyutta projeye değer mi?
8. Integration test stratejisi: WebApplicationFactory + Testcontainers SQL?
9. Multi-tenant olsa Department/Employee nasıl izole edilir?
10. Outbox / domain event: employee silindiğinde user’a ne olur senaryosu?
11. Rate limiting login endpoint’ine nasıl eklenir?
12. Secret yönetimi: appsettings’teki JWT key production’da nereye?

---

# 13. Kısa “doğru / yanlış” turu

| # | İfade | Doğru mu? |
|---|--------|-----------|
| 1 | Tüm entity’ler `Guid` PK kullanır | **Yanlış** (`int`) |
| 2 | Soft delete vardır | **Yanlış** |
| 3 | `UserRole` audit alanları taşır | **Yanlış** |
| 4 | AddressType DB’de string saklanır | **Doğru** |
| 5 | Department silmek Cascade employee siler | **Yanlış** (Restrict) |
| 6 | Register için JWT zorunlu | **Yanlış** (AllowAnonymous) |
| 7 | `ITokenService` Scoped | **Yanlış** (Singleton) |
| 8 | Okuma sorgularında sık `AsNoTracking` | **Doğru** |
| 9 | İzinler login anında JWT’ye yazılır | **Doğru** |
| 10 | Exception middleware response başladıysa yine JSON yazar | **Yanlış** (rethrow) |

---

# 14. Mülakatçı skor kartı (özet)

| Seviye | Minimum beklenen |
|--------|------------------|
| **Junior** | Entity/DTO farkı, Guid nedir, Controller→Service akışı, JWT’nin ne olduğu, 401/403 |
| **Mid** | Fluent delete behaviors, ProjectTo, permission policy, SyncAddresses, audit SaveChanges, DI lifetimes |
| **Senior** | Stale JWT permissions, race+unique index, soft delete tasarımı, register güvenlik açığı, UTC audit, ölçeklenebilir paging |

---

# 15. Dosya haritası (soru sırasında referans)

| Konu | Dosya |
|------|--------|
| Base entity / GUID generator | `Models/Common/Entity.cs` |
| Employee | `Models/Employee.cs` |
| DbContext + audit + Fluent | `Data/AppDbContext.cs` |
| Seed | `Data/DbSeeder.cs` |
| Employee iş kuralları | `Services/Implementations/EmployeeService.cs` |
| Login / Register | `Services/Implementations/AuthService.cs` |
| JWT üretimi | `Services/Implementations/JwtTokenService.cs` |
| Permissions | `Auth/Permissions.cs` |
| HasPermission | `Auth/HasPermissionAttribute.cs` |
| Employees API | `Controllers/EmployeesController.cs` |
| Auth API | `Controllers/AuthController.cs` |
| Hata middleware | `Middleware/ExceptionHandlingMiddleware.cs` |
| DI / pipeline | `Program.cs` |

---

*Doküman, PosCubeCase `employee-api` kodunun mevcut haline göre hazırlanmıştır. Kod değiştikçe cevap anahtarlarını güncelleyin.*
