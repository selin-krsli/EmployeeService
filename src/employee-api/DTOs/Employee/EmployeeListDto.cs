namespace EmployeeService.DTOs.Employee;

public class EmployeeListDto
{
    public int Id { get; set; }

    public string EmployeeNumber { get; set; } = string.Empty;

    public string IdentityNumber { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }

    public DateOnly DateOfBirth { get; set; }

    public DateOnly HireDate { get; set; }

    public int DepartmentId { get; set; }

    public string DepartmentName { get; set; } = string.Empty;

    public string? JobTitle { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public List<AddressDto> Addresses { get; set; } = new();
}
