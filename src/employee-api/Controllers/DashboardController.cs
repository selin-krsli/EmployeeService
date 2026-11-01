using EmployeeService.Auth;
using EmployeeService.DTOs.Dashboard;
using EmployeeService.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    [HasPermission(Permissions.Employees.Read)]
    [HasPermission(Permissions.Departments.Read)]
    public async Task<ActionResult<DashboardDto>> Get(CancellationToken cancellationToken)
    {
        var dashboard = await _dashboardService.GetAsync(cancellationToken);
        return Ok(dashboard);
    }
}
