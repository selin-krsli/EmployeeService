using EmployeeService.Auth;
using EmployeeService.DTOs.Users;
using EmployeeService.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IUserService _userService;

    public AuthController(IAuthService authService, IUserService userService)
    {
        _authService = authService;
        _userService = userService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto, CancellationToken cancellationToken)
    {
        var response = await _authService.LoginAsync(dto, cancellationToken);
        if (response is null)
        {
            return Unauthorized(new { message = "Kullanıcı adı, e-posta veya parola hatalı." });
        }

        return Ok(response);
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<UserDto>> Register(RegisterDto dto, CancellationToken cancellationToken)
    {
        var created = await _authService.RegisterAsync(dto, User.IsInRole(AppRoles.Admin), cancellationToken);
        return CreatedAtAction(nameof(UsersController.GetById), "Users", new { id = created.Id }, created);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me(CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirst(AppClaimTypes.UserId)?.Value, out var userId))
        {
            return Unauthorized();
        }

        var user = await _userService.GetByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(user);
    }
}
