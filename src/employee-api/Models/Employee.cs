using EmployeeService.Models.Common;

namespace EmployeeService.Models;

public class Employee : Entity<int>
{
    public string EmployeeNumber { get; set; } = string.Empty;

    public string IdentityNumber { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }

    public DateOnly DateOfBirth { get; set; }

    public DateOnly HireDate { get; set; }

    public int DepartmentId { get; set; }

    public Department Department { get; set; } = null!;

    public string? JobTitle { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<Address> Addresses { get; set; } = new List<Address>();
}
