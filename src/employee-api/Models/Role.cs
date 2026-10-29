using EmployeeService.Models.Common;

namespace EmployeeService.Models;

public class Role : Entity<int>
{
    public string Name { get; set; } = string.Empty;

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();

    public ICollection<RoleClaim> RoleClaims { get; set; } = new List<RoleClaim>();
}
