using System.ComponentModel.DataAnnotations;

namespace EmployeeService.DTOs.Employee;

public class EmployeeUpdateDto
{
    [Required]
    [StringLength(11, MinimumLength = 11)]
    public string IdentityNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [StringLength(20)]
    public string? PhoneNumber { get; set; }

    [Required]
    public DateOnly DateOfBirth { get; set; }

    [Required]
    public DateOnly HireDate { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int DepartmentId { get; set; }

    [StringLength(100)]
    public string? JobTitle { get; set; }

    public bool IsActive { get; set; } = true;

    public List<AddressUpsertDto> Addresses { get; set; } = new();
}
