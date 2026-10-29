<<<<<<< HEAD
# Employee Service

Personel, birim ve kullanıcı hesaplarını yönetmek için geliştirilmiş **tam yığın (full-stack)** uygulama.
Arka uç ASP.NET Core 9, ön yüz Angular 21 ile yazılmıştır. SQL Server, API ve arayüz Docker Compose ile tek komutla ayağa kalkar.

---

## İçindekiler

- [Başlangıç](#başlangıç)
  - [Ön Koşullar](#ön-koşullar)
  - [Ortam Değişkenleri](#ortam-değişkenleri)
  - [Docker ile Çalıştırma](#docker-ile-çalıştırma)
  - [Yerel Geliştirme](#yerel-geliştirme)
- [Özellikler](#özellikler)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Mimari](#mimari)
- [Proje Yapısı](#proje-yapısı)
- [API Dokümantasyonu](#api-dokümantasyonu)
- [Kimlik Doğrulama ve Yetkilendirme](#kimlik-doğrulama-ve-yetkilendirme)
- [İzin Matrisi](#i̇zin-matrisi)
- [Varlık Modeli](#varlık-modeli)

---

## Başlangıç

### Ön Koşullar

| Araç | Minimum Sürüm |
|---|---|
| Docker Desktop | 4.x |
| Docker Compose | v2 |
| .NET SDK *(yalnızca yerel geliştirme)* | 9.0 |
| Node.js *(yalnızca yerel geliştirme)* | 22.x |

### Ortam Değişkenleri

Docker Compose içindeki API servisi şu değişkenleri kullanır. İç içe `appsettings` anahtarları `__` ile yazılır.

```env
# Çalışma ortamı ve dinlenen adres
ASPNETCORE_ENVIRONMENT=Development
ASPNETCORE_URLS=http://+:5001

# SQL Server
ConnectionStrings__DefaultConnection=Server=sqlserver,1433;Database=EmployeeServiceDb;User Id=sa;Password=PosCube_Sql123!;TrustServerCertificate=True;MultipleActiveResultSets=true

# JWT
JwtSettings__Issuer=EmployeeService
JwtSettings__Audience=EmployeeServiceClient
JwtSettings__SecretKey=docker-dev-secret-key-must-be-32+
JwtSettings__ExpirationMinutes=60

# Başlangıç
SeedOnStartup=true
DisableHttpsRedirection=true
```

| Değişken | Karşılığı | Açıklama |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | `ConnectionStrings:DefaultConnection` | EF Core bağlantı dizesi |
| `JwtSettings__Issuer` | `JwtSettings:Issuer` | Token üreticisi |
| `JwtSettings__Audience` | `JwtSettings:Audience` | Token hedef kitlesi |
| `JwtSettings__SecretKey` | `JwtSettings:SecretKey` | HMAC-SHA256 imza anahtarı |
| `JwtSettings__ExpirationMinutes` | `JwtSettings:ExpirationMinutes` | Access token süresi (1–1440 dakika) |
| `SeedOnStartup` | `SeedOnStartup` | `true` ise migration ve demo veri uygulanır |
| `DisableHttpsRedirection` | `DisableHttpsRedirection` | `true` ise HTTP yönlendirmesi kapanır |

> **Not:** `JwtSettings__SecretKey` en az 32 karakter (256-bit) olmalıdır. Üretimde `docker-compose.yml` içindeki geliştirme anahtarını ve `sa` parolasını değiştirin.

SQL Server konteyneri ayrıca şunları bekler:

```env
ACCEPT_EULA=Y
MSSQL_SA_PASSWORD=PosCube_Sql123!
```

Angular, Docker içinde ayrı bir `.env` okumaz. `docker` derleme yapılandırması `environment.docker.ts` dosyasını kullanır ve API adresini `http://localhost:5001/api` yapar. CORS politikası `http://localhost:4200` kaynağına açıktır.

### Docker ile Çalıştırma

```bash
# SQL Server + API + Angular derle ve başlat
docker compose up --build

# Arka planda çalıştırmak için
docker compose up --build -d
```

Servisler ayağa kalktıktan sonra:

| Servis | URL |
|---|---|
| Angular arayüzü | http://localhost:4200 |
| REST API | http://localhost:5001 |
| Swagger | http://localhost:5001/swagger |
| SQL Server | localhost:1433 |

```bash
# Servisleri durdur ve veritabanı volume'unu sil
docker compose down -v
```

> **Başlatma sırası:** SQL Server sağlık kontrolünü geçmeden API başlamaz. API, bekleyen migration'ları uygular. `SeedOnStartup=true` iken demo birimler, personeller ve iki hesap eklenir. Admin ve Viewer hesapları personel kaydına bağlı değildir.

Demo hesaplar (kullanıcı adı boşsa eklenir):

| Rol | Kullanıcı adı | Parola | E-posta |
|---|---|---|---|
| Admin | `admin` | `Admin123!` | `admin@poscube.com` |
| Viewer | `viewer` | `Viewer123!` | `viewer@poscube.com` |

### Yerel Geliştirme

Docker kullanmadan çalıştırmak için makinede SQL Server gerekir. API, geliştirme ortamında (`ASPNETCORE_ENVIRONMENT=Development`) açılışta migration ve seed çalıştırır.

#### Arka uç

`src/employee-api/appsettings.json` içindeki bağlantı dizesini kendi SQL Server örneğinize göre düzenleyin. `JwtSettings:SecretKey` değerini `appsettings.Development.json` içinde, en az 32 karakter olacak şekilde verin.

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=EmployeeServiceDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
  },
  "JwtSettings": {
    "Issuer": "EmployeeService",
    "Audience": "EmployeeServiceClient",
    "SecretKey": "your-super-secret-key-minimum-32-characters",
    "ExpirationMinutes": 60
  }
}
```

```bash
cd src/employee-api
dotnet run --launch-profile https
```

| Profil | Adres |
|---|---|
| `https` | https://localhost:7137 ve http://localhost:5001 |
| `http` | http://localhost:5001 |

Swagger, geliştirme ortamında `/swagger` altındadır.

#### Ön yüz

Yerel `ng serve`, API adresini `https://localhost:7137/api` olarak kullanır. API'yi yalnızca HTTP profiliyle çalıştırıyorsanız `environment.development.ts` içindeki `apiUrl` değerini `http://localhost:5001/api` yapın.

```bash
cd src/employee-client
npm install
npm start
```

Arayüz: http://localhost:4200

---

## Özellikler

| Modül | Açıklama |
|---|---|
| **Kimlik doğrulama** | JWT access token, giriş ve oturum bilgisi (`/me`) |
| **Kullanıcı yönetimi** | Personele bağlı hesap açma, güncelleme, silme, parola değiştirme, rol atama |
| **Rol ve izinler** | Admin ve Viewer rolleri, `modül.eylem` biçiminde izin talepleri |
| **Personel** | Kimlik, iletişim, birim, işe giriş, aktif/pasif durum, ev ve iş adresi |
| **Birimler** | Birim tanımlama, personel sayısı, arama ve sayfalama |
| **Dashboard** | Personel ve birim özetleri, birim dağılımı, son kayıtlar |
| **Denetim** | Kayıtlarda `CreatedAt` ve `UpdatedAt` otomatik doldurulur |

Kullanıcılar ve rol ekranları yalnızca Admin rolüne açıktır. Viewer, personel ve birimleri görüntüleyebilir.

---

## Teknoloji Yığını

### Arka uç

| Bileşen | Teknoloji |
|---|---|
| Çerçeve | ASP.NET Core 9 |
| ORM | Entity Framework Core 9 (SQL Server) |
| Eşleme | AutoMapper |
| Kimlik | JWT Bearer, ASP.NET Core `PasswordHasher` |
| API dokümantasyonu | Swashbuckle (Swagger) |
| Veritabanı | Microsoft SQL Server 2022 |
| Konteyner | Docker (SDK 9 imajı ile yayın, ASP.NET 9 çalışma zamanı) |

### Ön yüz

| Bileşen | Teknoloji |
|---|---|
| Çerçeve | Angular 21 (standalone bileşenler) |
| UI | Bootstrap 5 + Bootstrap Icons |
| HTTP | Angular HttpClient ve JWT interceptor |
| Bildirimler | SweetAlert2 |
| Konteyner | Docker (Node 22, `ng serve` docker yapılandırması) |

---

## Mimari

API katmanlıdır: controller istekleri servislere iletir, servisler EF Core ve AutoMapper kullanır. Ayrı bir CQRS veya MediatR katmanı yoktur.

```
┌─────────────────────────────────────────────────────┐
│                    Angular Client                   │
│                 (SPA – port 4200)                   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / REST + JWT
┌──────────────────────▼──────────────────────────────┐
│                  ASP.NET Core API                   │
│              (Controllers – port 5001)              │
│  ┌──────────────────────────────────────────────┐   │
│  │  Services  ·  DTOs  ·  AutoMapper            │   │
│  └───────────────────┬──────────────────────────┘   │
│  ┌───────────────────▼──────────────────────────┐   │
│  │  EF Core DbContext  ·  JWT  ·  İzin politikaları │
│  └───────────────────┬──────────────────────────┘   │
└──────────────────────┼──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│            SQL Server 2022 (port 1433)              │
│                 EmployeeServiceDb                   │
└─────────────────────────────────────────────────────┘
```

İstek sırası:

```
İstemci
  └─► ExceptionHandlingMiddleware
        └─► CORS (http://localhost:4200)
              └─► Authentication (JWT)
                    └─► Authorization (izin politikası)
                          └─► Controller
                                └─► Service
                                      └─► AppDbContext
```

---

## Proje Yapısı

```
PosCubeCase/
├── docker-compose.yml
├── EmployeeService.sln
└── src/
    ├── employee-api/
    │   ├── Auth/                 # JWT ayarları, roller, izinler
    │   ├── Controllers/
    │   ├── Data/                 # AppDbContext, migration, DbSeeder
    │   ├── DTOs/
    │   ├── Mappings/             # AutoMapper profilleri
    │   ├── Middleware/
    │   ├── Models/
    │   ├── Services/
    │   ├── Program.cs
    │   └── Dockerfile
    └── employee-client/
        ├── Dockerfile
        └── src/app/
            ├── core/             # auth, modeller, servisler
            ├── features/         # dashboard, personel, birim, kullanıcı, rol
            ├── layout/
            └── shared/
```

---

## API Dokümantasyonu

Geliştirme ortamında Swagger:

```
http://localhost:5001/swagger
https://localhost:7137/swagger
```

Liste uçlarının `paged` karşılığı `page`, `pageSize` ve `search` sorgu parametrelerini alır. Personel listesi ayrıca `isActive` kabul eder.

### Kimlik doğrulama — `/api/auth`

| Metod | Uç nokta | Açıklama | Auth |
|---|---|---|---|
| `POST` | `/login` | Kullanıcı adı veya e-posta ile giriş, access token döner | Hayır |
| `POST` | `/register` | Seçilen personele hesap açar | Hayır* |
| `GET` | `/me` | Oturumdaki kullanıcı | Evet |

\* Veritabanında kullanıcı varken Admin rolü yalnızca Admin tarafından verilebilir.

### Kullanıcılar — `/api/users`

| Metod | Uç nokta | İzin |
|---|---|---|
| `GET` | `/` | `users.read` |
| `GET` | `/paged` | `users.read` |
| `GET` | `/{id}` | `users.read` |
| `PUT` | `/{id}` | `users.update` |
| `PUT` | `/{id}/change-password` | `users.update` |
| `DELETE` | `/{id}` | `users.delete` |

Hesap oluşturma `POST /api/auth/register` üzerindedir.

### Personeller — `/api/employees`

| Metod | Uç nokta | İzin |
|---|---|---|
| `GET` | `/` | `employees.read` |
| `GET` | `/paged` | `employees.read` |
| `GET` | `/{id}` | `employees.read` |
| `POST` | `/` | `employees.create` |
| `PUT` | `/{id}` | `employees.update` |
| `DELETE` | `/{id}` | `employees.delete` |

### Birimler — `/api/departments`

| Metod | Uç nokta | İzin |
|---|---|---|
| `GET` | `/` | `departments.read` |
| `GET` | `/paged` | `departments.read` |
| `GET` | `/{id}` | `departments.read` |
| `POST` | `/` | `departments.create` |
| `PUT` | `/{id}` | `departments.update` |
| `DELETE` | `/{id}` | `departments.delete` |

### Roller — `/api/roles`

| Metod | Uç nokta | İzin |
|---|---|---|
| `GET` | `/` | `roles.read` |
| `GET` | `/paged` | `roles.read` |

Rol kayıtları migration ile eklenir; API üzerinden oluşturulmaz.

---

## Kimlik Doğrulama ve Yetkilendirme

### JWT akışı

```
1. POST /api/auth/login
   → { token, ... }

2. Sonraki isteklerde
   Authorization: Bearer <token>

3. Oturum bilgisi
   GET /api/auth/me
```

| Parametre | Varsayılan |
|---|---|
| Access token süresi | 60 dakika |
| Clock skew | 1 dakika |
| Refresh token | Yok |

İmza anahtarı `JwtSettings:SecretKey` alanındadır ve en az 32 karakter olmalıdır.

### İzin tabanlı yetkilendirme

Uç noktalar `[HasPermission("employees.read")]` ile korunur. Her izin aynı adlı bir authorization policy olarak kaydedilir. Policy, JWT içindeki `permission` talebini arar. Talepler kullanıcının rolüne bağlı `RoleClaims` kayıtlarından üretilir.

Arayüzde kullanıcı ve rol sayfaları `roleGuard` ile Admin rolüne kilitlenir. Diğer ekranlar oturum zorunludur; butonlar kullanıcının rolüne göre gösterilir.

---

## İzin Matrisi

| Modül | Create | Read | Update | Delete | Admin | Viewer |
|---|---|---|---|---|---|---|
| `employees` | `employees.create` | `employees.read` | `employees.update` | `employees.delete` | Tümü | Yalnızca okuma |
| `departments` | `departments.create` | `departments.read` | `departments.update` | `departments.delete` | Tümü | Yalnızca okuma |
| `users` | `users.create` | `users.read` | `users.update` | `users.delete` | Tümü | Yok |
| `roles` | Yok | `roles.read` | Yok | Yok | Okuma | Yok |

Çalışma anındaki kaynak `RoleClaims` tablosudur. Yukarıdaki dağılım, migration ile yazılan varsayılan taleplerdir.

---

## Varlık Modeli

```
Department ──── Employee ──── Address
                   │
                   └──── User ──── UserRole ──── Role ──── RoleClaim
```

### Temel varlıklar

**`Department`**

| Alan | Tür | Açıklama |
|---|---|---|
| `Id` | `int` | Birincil anahtar |
| `Name` | `string` | Birim adı |

**`Employee`**

| Alan | Tür | Açıklama |
|---|---|---|
| `Id` | `int` | Birincil anahtar |
| `EmployeeNumber` | `string` | Personel numarası |
| `IdentityNumber` | `string` | Kimlik numarası |
| `FirstName`, `LastName` | `string` | Ad ve soyad |
| `Email` | `string` | E-posta |
| `PhoneNumber` | `string?` | Telefon |
| `DateOfBirth`, `HireDate` | `DateOnly` | Doğum ve işe giriş |
| `DepartmentId` | `int` | Birim FK |
| `JobTitle` | `string?` | Ünvan |
| `IsActive` | `bool` | Aktiflik |

**`Address`**

| Alan | Tür | Açıklama |
|---|---|---|
| `Id` | `int` | Birincil anahtar |
| `EmployeeId` | `int` | Personel FK |
| `AddressType` | `enum` | `Home` veya `Work` |
| `City`, `District` | `string` | İl ve ilçe |
| `PostalCode` | `string?` | Posta kodu |
| `FullAddress` | `string` | Açık adres |
| `Country` | `string` | Varsayılan `Turkey` |

**`User`**

| Alan | Tür | Açıklama |
|---|---|---|
| `Id` | `int` | Birincil anahtar |
| `UserName` | `string` | Kullanıcı adı |
| `Email` | `string` | Bağlı personelin e-postası; sistem hesaplarında doğrudan kayıt |
| `PasswordHash` | `string` | Parola özeti |
| `IsActive` | `bool` | Hesap durumu |
| `EmployeeId` | `int?` | Personel FK; Admin ve Viewer için boş olabilir |

Tüm kalıcı varlıklar `Entity<TId>` sınıfından türer. `CreatedAt` ve `UpdatedAt` alanları `AppDbContext.SaveChanges` sırasında UTC olarak yazılır.
=======
# EmployeeService
>>>>>>> 332feec1e496c1764d3ed7be589b4c98fa550573
