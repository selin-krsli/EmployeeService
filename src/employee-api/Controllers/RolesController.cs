using EmployeeService.Auth;
using EmployeeService.DTOs.Common;
using EmployeeService.DTOs.Department;
using EmployeeService.DTOs.Employee;
using EmployeeService.DTOs.Roles;
using EmployeeService.DTOs.Users;
using EmployeeService.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeService.Controllers;

[ApiController]
[Route("api/[controller]")]
[HasPermission(Permissions.Roles.Read)]
public class RolesController : ControllerBase
{
    private readonly IRoleService _roleService;

    public RolesController(IRoleService roleService)
    {
        _roleService = roleService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoleDto>>> GetAll(CancellationToken cancellationToken)
    {
        var roles = await _roleService.GetAllAsync(cancellationToken);
        return Ok(roles);
    }

    [HttpGet("paged")]
    public async Task<ActionResult<PagedResult<RoleDto>>> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageRequest.DefaultPageSize,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _roleService.GetPagedAsync(page, pageSize, search, cancellationToken);
        return Ok(result);
    }
}
