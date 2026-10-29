using EmployeeService.Models.Common;

namespace EmployeeService.Models;

public class Address : Entity<int>
{
    public int EmployeeId { get; set; }

    public AddressType AddressType { get; set; }

    public string City { get; set; } = string.Empty;

    public string District { get; set; } = string.Empty;

    public string? PostalCode { get; set; }

    public string FullAddress { get; set; } = string.Empty;

    public string Country { get; set; } = "Turkey";

    public Employee Employee { get; set; } = null!;
}
