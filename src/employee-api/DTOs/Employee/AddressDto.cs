using EmployeeService.Models;

namespace EmployeeService.DTOs.Employee;

public class AddressDto
{
    public int Id { get; set; }

    public AddressType AddressType { get; set; }

    public string City { get; set; } = string.Empty;

    public string District { get; set; } = string.Empty;

    public string? PostalCode { get; set; }

    public string FullAddress { get; set; } = string.Empty;

    public string Country { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
