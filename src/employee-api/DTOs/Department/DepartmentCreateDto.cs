using System.ComponentModel.DataAnnotations;

namespace EmployeeService.DTOs.Department;

public class DepartmentCreateDto
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;
}
