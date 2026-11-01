namespace EmployeeService.DTOs.Dashboard;

public class DepartmentForPieChartDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int Count { get; set; }

    public int Percent { get; set; }
}
