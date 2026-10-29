using EmployeeService.Auth;
using EmployeeService.DTOs.Common;
using EmployeeService.DTOs.Users;
using EmployeeService.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    [HasPermission(Permissions.Users.Read)]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetAll(CancellationToken cancellationToken)
    {
        var users = await _userService.GetAllAsync(cancellationToken);
        return Ok(users);
    }

    [HttpGet("paged")]
    [HasPermission(Permissions.Users.Read)]
    public async Task<ActionResult<PagedResult<UserDto>>> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageRequest.DefaultPageSize,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _userService.GetPagedAsync(page, pageSize, search, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [HasPermission(Permissions.Users.Read)]
    public async Task<ActionResult<UserDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var user = await _userService.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(user);
    }

    [HttpPut("{id:int}")]
    [HasPermission(Permissions.Users.Update)]
    public async Task<IActionResult> Update(int id, UserUpdateDto dto, CancellationToken cancellationToken)
    {
        var updated = await _userService.UpdateAsync(id, dto, cancellationToken);
        if (!updated)
        {
            return NotFound();
        }

        return Ok(new { success = true });
    }

    [HttpPut("{id:int}/change-password")]
    [HasPermission(Permissions.Users.Update)]
    public async Task<IActionResult> ChangePassword(
        int id,
        ChangePasswordDto dto,
        CancellationToken cancellationToken)
    {
        var changed = await _userService.ChangePasswordAsync(id, dto, cancellationToken);
        if (!changed)
        {
            return NotFound();
        }

        return Ok(new { success = true });
    }

    [HttpDelete("{id:int}")]
    [HasPermission(Permissions.Users.Delete)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        if (User.FindFirst(AppClaimTypes.UserId)?.Value == id.ToString())
        {
            return BadRequest(new { success = false, message = "Kendi hesabınızı silemezsiniz." });
        }

        var deleted = await _userService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            return NotFound(new { success = false, message = "Kullanıcı bulunamadı." });
        }

        return Ok(new { success = true, message = "Kullanıcı silindi." });
    }
}
