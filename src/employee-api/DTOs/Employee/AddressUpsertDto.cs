using System.ComponentModel.DataAnnotations;
using EmployeeService.Models;

namespace EmployeeService.DTOs.Employee;

public class AddressUpsertDto
{
    [Required]
    public AddressType AddressType { get; set; }

    [Required]
    [StringLength(100)]
    public string City { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string District { get; set; } = string.Empty;

    [StringLength(10)]
    public string? PostalCode { get; set; }

    [Required]
    [StringLength(130)]
    public string FullAddress { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string Country { get; set; } = "Turkey";
}
