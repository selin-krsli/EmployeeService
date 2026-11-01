using System.ComponentModel.DataAnnotations;

namespace EmployeeService.DTOs.Users;

public class LoginDto
{
    [Required]
    [StringLength(256)]
    public string UserName { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string Password { get; set; } = string.Empty;
}
