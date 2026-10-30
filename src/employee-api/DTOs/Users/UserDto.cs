namespace EmployeeService.DTOs.Users;

public class UserDto
{
    public int Id { get; set; }

    public string UserName { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public int? EmployeeId { get; set; }

    public string? EmployeeNumber { get; set; }

    public bool IsActive { get; set; }

    /// <summary>Seeded super admin (admin@poscube.com). Other admins cannot change this account.</summary>
    public bool IsSuperAdmin { get; set; }

    public DateTime CreatedAt { get; set; }

    public List<string> Roles { get; set; } = new();
}
