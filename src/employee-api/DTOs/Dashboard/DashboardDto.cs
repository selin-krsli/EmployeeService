using EmployeeService.DTOs.Employee;

namespace EmployeeService.DTOs.Dashboard;

public class DashboardDto
{
    public int TotalEmployees { get; set; }

    public int ActiveEmployees { get; set; }

    public int PassiveEmployees { get; set; }

    public int TotalDepartments { get; set; }

    public int HiredThisMonth { get; set; }

    public IReadOnlyList<DepartmentForPieChartDto> DepartmentForPieChart { get; set; } = [];

    public IReadOnlyList<EmployeeListDto> RecentEmployees { get; set; } = [];
}
