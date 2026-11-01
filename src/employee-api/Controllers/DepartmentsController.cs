using EmployeeService.Auth;
using EmployeeService.DTOs.Common;
using EmployeeService.DTOs.Department;
using EmployeeService.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DepartmentsController : ControllerBase
{
    private readonly IDepartmentService _departmentService;

    public DepartmentsController(IDepartmentService departmentService)
    {
        _departmentService = departmentService;
    }

    [HttpGet("paged")]
    [HasPermission(Permissions.Departments.Read)]
    public async Task<ActionResult<PagedResult<DepartmentDto>>> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageRequest.DefaultPageSize,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _departmentService.GetPagedAsync(page, pageSize, search, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [HasPermission(Permissions.Departments.Read)]
    public async Task<ActionResult<DepartmentDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var department = await _departmentService.GetByIdAsync(id, cancellationToken);
        if (department is null)
        {
            return NotFound();
        }

        return Ok(department);
    }

    [HttpPost]
    [HasPermission(Permissions.Departments.Create)]
    public async Task<ActionResult<DepartmentDto>> Create(DepartmentCreateDto dto, CancellationToken cancellationToken)
    {
        var created = await _departmentService.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [HasPermission(Permissions.Departments.Update)]
    public async Task<IActionResult> Update(int id, DepartmentUpdateDto dto, CancellationToken cancellationToken)
    {
        var updated = await _departmentService.UpdateAsync(id, dto, cancellationToken);
        if (!updated)
        {
            return NotFound();
        }

        return Ok(new { success = true });
    }

    [HttpDelete("{id:int}")]
    [HasPermission(Permissions.Departments.Delete)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var deleted = await _departmentService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            return NotFound(new { success = false, message = "Birim bulunamadı." });
        }

        return Ok(new { success = true, message = "Birim silindi." });
    }
}
