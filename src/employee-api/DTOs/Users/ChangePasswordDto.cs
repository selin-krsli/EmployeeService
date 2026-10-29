using System.ComponentModel.DataAnnotations;

namespace EmployeeService.DTOs.Users;

public class ChangePasswordDto
{
    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string NewPassword { get; set; } = string.Empty;
}
