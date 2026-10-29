using EmployeeService.Auth;
using EmployeeService.DTOs.Common;
using EmployeeService.DTOs.Employee;
using EmployeeService.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;

    public EmployeesController(IEmployeeService employeeService)
    {
        _employeeService = employeeService;
    }

    [HttpGet]
    [HasPermission(Permissions.Employees.Read)]
    public async Task<ActionResult<IReadOnlyList<EmployeeListDto>>> GetAll(CancellationToken cancellationToken)
    {
        var employees = await _employeeService.GetAllAsync(cancellationToken);
        return Ok(employees);
    }

    [HttpGet("paged")]
    [HasPermission(Permissions.Employees.Read)]
    public async Task<ActionResult<PagedResult<EmployeeListDto>>> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageRequest.DefaultPageSize,
        [FromQuery] string? search = null,
        [FromQuery] bool? isActive = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _employeeService.GetPagedAsync(page, pageSize, search, isActive, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [HasPermission(Permissions.Employees.Read)]
    public async Task<ActionResult<EmployeeListDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var employee = await _employeeService.GetByIdAsync(id, cancellationToken);
        if (employee is null)
        {
            return NotFound();
        }

        return Ok(employee);
    }

    [HttpPost]
    [HasPermission(Permissions.Employees.Create)]
    public async Task<ActionResult<EmployeeListDto>> Create(EmployeeCreateDto dto, CancellationToken cancellationToken)
    {
        var created = await _employeeService.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [HasPermission(Permissions.Employees.Update)]
    public async Task<IActionResult> Update(int id, EmployeeUpdateDto dto, CancellationToken cancellationToken)
    {
        var updated = await _employeeService.UpdateAsync(id, dto, cancellationToken);
        if (!updated)
        {
            return NotFound();
        }

        return Ok(new { success = true });
    }

    [HttpDelete("{id:int}")]
    [HasPermission(Permissions.Employees.Delete)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var deleted = await _employeeService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            return NotFound(new { success = false, message = "Personel bulunamadı." });
        }

        return Ok(new { success = true, message = "Personel silindi." });
    }
}
