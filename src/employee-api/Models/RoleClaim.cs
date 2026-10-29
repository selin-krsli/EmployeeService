using EmployeeService.Models.Common;

namespace EmployeeService.Models;

public class RoleClaim : Entity<int>
{
    public int RoleId { get; set; }

    public Role Role { get; set; } = null!;

    public string ClaimType { get; set; } = string.Empty;

    public string ClaimValue { get; set; } = string.Empty;
}
