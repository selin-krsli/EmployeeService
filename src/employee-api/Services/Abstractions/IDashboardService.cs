using EmployeeService.DTOs.Dashboard;

namespace EmployeeService.Services.Abstractions;

public interface IDashboardService
{
    Task<DashboardDto> GetAsync(CancellationToken cancellationToken = default);
}
