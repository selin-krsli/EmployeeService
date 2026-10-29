using EmployeeService.DTOs.Department;
using EmployeeService.DTOs.Employee;
using EmployeeService.DTOs.Roles;
using EmployeeService.DTOs.Users;

namespace EmployeeService.Services.Abstractions;

public interface IAuthService
{
    Task<AuthResponseDto?> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);

    /// <exception cref="Exceptions.AppException">Invalid role/employee, forbidden Admin grant, or uniqueness conflict.</exception>
    Task<UserDto> RegisterAsync(RegisterDto dto, bool callerIsAdmin, CancellationToken cancellationToken = default);
}
