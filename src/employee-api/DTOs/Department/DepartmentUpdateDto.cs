using System.ComponentModel.DataAnnotations;

namespace EmployeeService.DTOs.Department;

public class DepartmentUpdateDto
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;
}
