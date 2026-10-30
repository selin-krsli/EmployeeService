using EmployeeService.Auth;
using EmployeeService.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace EmployeeService.Data;

/// <summary>
/// Applies pending migrations and inserts demo data on startup. Roles and role claims are seeded
/// by migrations (<c>HasData</c>); this adds departments, employees, addresses and the two demo users.
/// Admin/Viewer are users only (no employee row). Demo employees are added only when departments
/// are empty; demo users only when their user name is free.
/// </summary>
public static class DbSeeder
{
    public const string AdminUserName = "admin";
    public const string AdminEmail = "admin@poscube.com";
    public const string AdminPassword = "Admin123!";

    public const string ViewerUserName = "viewer";
    public const string ViewerPassword = "Viewer123!";

    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

        await context.Database.MigrateAsync(cancellationToken);

        await SeedEmployeesAsync(context, cancellationToken);
        await SeedUsersAsync(context, passwordHasher, cancellationToken);
    }

    private static async Task SeedEmployeesAsync(AppDbContext context, CancellationToken cancellationToken)
    {
        if (await context.Departments.AnyAsync(cancellationToken))
        {
            return;
        }

        var it = new Department { Name = "Bilgi İşlem" };
        var hr = new Department { Name = "İnsan Kaynakları" };
        var finance = new Department { Name = "Muhasebe" };

        context.Departments.AddRange(it, hr, finance);

        context.Employees.AddRange(
            new Employee
            {
                EmployeeNumber = "EMP-00001",
                IdentityNumber = "10000000146",
                FirstName = "Ahmet",
                LastName = "Yılmaz",
                Email = "ahmet.yilmaz@poscube.com",
                PhoneNumber = "05321112233",
                DateOfBirth = new DateOnly(1988, 4, 12),
                HireDate = new DateOnly(2020, 1, 6),
                Department = it,
                JobTitle = "Yazılım Geliştirici",
                Addresses =
                {
                    new Address
                    {
                        AddressType = AddressType.Home,
                        City = "İstanbul",
                        District = "Kadıköy",
                        PostalCode = "34710",
                        FullAddress = "Caferağa Mah. Moda Cad. No:12 D:4"
                    },
                    new Address
                    {
                        AddressType = AddressType.Work,
                        City = "İstanbul",
                        District = "Ataşehir",
                        PostalCode = "34746",
                        FullAddress = "Barbaros Mah. Begonya Sok. No:3 Kat:5"
                    }
                }
            },
            new Employee
            {
                EmployeeNumber = "EMP-00002",
                IdentityNumber = "10000000278",
                FirstName = "Ayşe",
                LastName = "Demir",
                Email = "ayse.demir@poscube.com",
                PhoneNumber = "05334445566",
                DateOfBirth = new DateOnly(1992, 9, 3),
                HireDate = new DateOnly(2021, 3, 15),
                Department = hr,
                JobTitle = "İK Uzmanı",
                Addresses =
                {
                    new Address
                    {
                        AddressType = AddressType.Home,
                        City = "Ankara",
                        District = "Çankaya",
                        PostalCode = "06690",
                        FullAddress = "Kızılay Mah. Atatürk Bulv. No:45 D:8"
                    }
                }
            },
            new Employee
            {
                EmployeeNumber = "EMP-00003",
                IdentityNumber = "10000000390",
                FirstName = "Mehmet",
                LastName = "Kaya",
                Email = "mehmet.kaya@poscube.com",
                PhoneNumber = "05357778899",
                DateOfBirth = new DateOnly(1985, 12, 20),
                HireDate = new DateOnly(2019, 7, 1),
                Department = finance,
                JobTitle = "Muhasebe Müdürü",
                Addresses =
                {
                    new Address
                    {
                        AddressType = AddressType.Home,
                        City = "İzmir",
                        District = "Karşıyaka",
                        PostalCode = "35540",
                        FullAddress = "Bostanlı Mah. Cemal Gürsel Cad. No:210 D:2"
                    }
                }
            },
            new Employee
            {
                EmployeeNumber = "EMP-00004",
                IdentityNumber = "10000000412",
                FirstName = "Zeynep",
                LastName = "Çelik",
                Email = "zeynep.celik@poscube.com",
                PhoneNumber = "05321113344",
                DateOfBirth = new DateOnly(1994, 6, 18),
                HireDate = new DateOnly(2022, 5, 10),
                Department = it,
                JobTitle = "İş Analisti",
                Addresses =
                {
                    new Address
                    {
                        AddressType = AddressType.Home,
                        City = "İstanbul",
                        District = "Beşiktaş",
                        PostalCode = "34353",
                        FullAddress = "Levazım Mah. Koru Sok. No:7 D:3"
                    }
                }
            },
            new Employee
            {
                EmployeeNumber = "EMP-00005",
                IdentityNumber = "10000000534",
                FirstName = "Can",
                LastName = "Öztürk",
                Email = "can.ozturk@poscube.com",
                PhoneNumber = "05325556677",
                DateOfBirth = new DateOnly(1990, 11, 8),
                HireDate = new DateOnly(2021, 9, 1),
                Department = finance,
                JobTitle = "Muhasebe Uzmanı",
                Addresses =
                {
                    new Address
                    {
                        AddressType = AddressType.Home,
                        City = "Bursa",
                        District = "Nilüfer",
                        PostalCode = "16110",
                        FullAddress = "Özlüce Mah. FSM Bulv. No:88 D:5"
                    }
                }
            },
            new Employee
            {
                EmployeeNumber = "EMP-00006",
                IdentityNumber = "10000000656",
                FirstName = "Elif",
                LastName = "Arslan",
                Email = "elif.arslan@poscube.com",
                PhoneNumber = "05328889900",
                DateOfBirth = new DateOnly(1993, 3, 25),
                HireDate = new DateOnly(2023, 2, 20),
                Department = hr,
                JobTitle = "İşe Alım Uzmanı",
                Addresses =
                {
                    new Address
                    {
                        AddressType = AddressType.Home,
                        City = "Antalya",
                        District = "Muratpaşa",
                        PostalCode = "07100",
                        FullAddress = "Şirinyalı Mah. Lara Cad. No:15 D:9"
                    }
                }
            });

        await context.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedUsersAsync(
        AppDbContext context,
        IPasswordHasher<User> passwordHasher,
        CancellationToken cancellationToken)
    {
        await AddUserIfMissingAsync(
            context,
            passwordHasher,
            userName: AdminUserName,
            password: AdminPassword,
            email: AdminEmail,
            roleId: AppRoles.AdminId,
            cancellationToken);

        await AddUserIfMissingAsync(
            context,
            passwordHasher,
            userName: ViewerUserName,
            password: ViewerPassword,
            email: "viewer@poscube.com",
            roleId: AppRoles.ViewerId,
            cancellationToken);

        await context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Creates a standalone account (no employee link) so admin/viewer stay out of the employee list.
    /// </summary>
    private static async Task AddUserIfMissingAsync(
        AppDbContext context,
        IPasswordHasher<User> passwordHasher,
        string userName,
        string password,
        string email,
        int roleId,
        CancellationToken cancellationToken)
    {
        if (await context.Users.AnyAsync(u => u.UserName == userName, cancellationToken))
        {
            return;
        }

        var user = new User
        {
            UserName = userName,
            Email = email,
            EmployeeId = null,
            IsActive = true,
            UserRoles = { new UserRole { RoleId = roleId } }
        };
        user.PasswordHash = passwordHasher.HashPassword(user, password);

        context.Users.Add(user);
    }
}
