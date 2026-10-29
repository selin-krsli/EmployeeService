using EmployeeService.Models.Common;

namespace EmployeeService.Models;

public class Department : Entity<int>
{
    public string Name { get; set; } = string.Empty;

    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}
