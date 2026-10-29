using EmployeeService.DTOs.Roles;

namespace EmployeeService.Auth;

/// <summary>
/// Default permission claims per role (seeded into the RoleClaims table) and the helpers that
/// turn a role's claims into the module/CRUD rows shown on the "Yetki Dağılımı" screen.
/// At runtime the RoleClaims table is the source of truth, not this class.
/// </summary>
public static class RolePermissions
{
    private static readonly (string Key, string Label)[] Modules =
    {
        ("employees", "Personeller"),
        ("departments", "Birim Tanımlamalar"),
        ("users", "Kullanıcılar"),
        ("roles", "Roller")
    };

    private static readonly Dictionary<string, string> Descriptions = new(StringComparer.OrdinalIgnoreCase)
    {
        [AppRoles.Admin] = "Tüm modüllerde tam yetkili sistem yöneticisi.",
        [AppRoles.Viewer] = "Personel ve birim kayıtlarını yalnızca görüntüleyebilir."
    };

    public static readonly IReadOnlyDictionary<int, string[]> DefaultClaims = new Dictionary<int, string[]>
    {
        [AppRoles.AdminId] =
        [
            Permissions.Employees.Read, Permissions.Employees.Create, Permissions.Employees.Update, Permissions.Employees.Delete,
            Permissions.Departments.Read, Permissions.Departments.Create, Permissions.Departments.Update, Permissions.Departments.Delete,
            Permissions.Users.Read, Permissions.Users.Create, Permissions.Users.Update, Permissions.Users.Delete,
            Permissions.Roles.Read
        ],
        [AppRoles.ViewerId] =
        [
            Permissions.Employees.Read,
            Permissions.Departments.Read
        ]
    };

    public static string? GetDescription(string roleName)
    {
        return Descriptions.GetValueOrDefault(roleName);
    }

    public static List<ModulePermissionDto> ToModulePermissions(IReadOnlyCollection<string> claims)
    {
        return Modules
            .Select(module => new ModulePermissionDto
            {
                Module = module.Key,
                Label = module.Label,
                CanRead = claims.Contains($"{module.Key}.read"),
                CanCreate = claims.Contains($"{module.Key}.create"),
                CanUpdate = claims.Contains($"{module.Key}.update"),
                CanDelete = claims.Contains($"{module.Key}.delete")
            })
            .ToList();
    }
}
