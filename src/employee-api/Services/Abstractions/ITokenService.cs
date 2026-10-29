using EmployeeService.DTOs.Department;
using EmployeeService.DTOs.Employee;
using EmployeeService.DTOs.Roles;
using EmployeeService.DTOs.Users;

namespace EmployeeService.Services.Abstractions;

public interface ITokenService
{
    (string AccessToken, DateTime ExpiresAt) CreateAccessToken(UserDto user, IEnumerable<string> permissions);
}
