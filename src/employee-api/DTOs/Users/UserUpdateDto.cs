using System.ComponentModel.DataAnnotations;

namespace EmployeeService.DTOs.Users;

public class UserUpdateDto
{
    [Required]
    [StringLength(50, MinimumLength = 3)]
    [RegularExpression("^[a-zA-Z0-9._-]+$", ErrorMessage = "User name may contain only letters, digits, '.', '_' and '-'.")]
    public string UserName { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    [Required]
    [StringLength(50)]
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Optional password reset; null or empty keeps the current password.
    /// </summary>
    [StringLength(100, MinimumLength = 6)]
    public string? Password { get; set; }
}
