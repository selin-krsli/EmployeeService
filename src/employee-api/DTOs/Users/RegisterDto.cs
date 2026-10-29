using System.ComponentModel.DataAnnotations;

namespace EmployeeService.DTOs.Users;

/// <summary>
/// Name and email are not accepted from the client; they are copied from the selected employee.
/// </summary>
public class RegisterDto
{
    [Required]
    [Range(1, int.MaxValue)]
    public int EmployeeId { get; set; }

    [Required]
    [StringLength(50, MinimumLength = 3)]
    [RegularExpression("^[a-zA-Z0-9._-]+$", ErrorMessage = "User name may contain only letters, digits, '.', '_' and '-'.")]
    public string UserName { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    public string Role { get; set; } = string.Empty;
}
