using EmployeeService.Models.Common;

namespace EmployeeService.Models;

public class User : Entity<int>
{
    public string UserName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Null for accounts created before employee linking (or whose employee was deleted).
    /// </summary>
    public int? EmployeeId { get; set; }

    public Employee? Employee { get; set; }

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
