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

    /// <summary>Seeded default admin (admin@poscube.com). The client hides delete for this account.</summary>
    public bool IsDefaultAdmin { get; set; }

    public DateTime CreatedAt { get; set; }

    public List<string> Roles { get; set; } = new();
}
