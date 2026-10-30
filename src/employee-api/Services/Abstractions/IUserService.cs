using EmployeeService.DTOs.Common;
using EmployeeService.DTOs.Users;

namespace EmployeeService.Services.Abstractions;

public interface IUserService
{
    Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<PagedResult<UserDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken = default);

    Task<UserDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <exception cref="Exceptions.AppException">Super admin, invalid role, last-admin guard, or user name conflict.</exception>
    Task<bool> UpdateAsync(int id, UserUpdateDto dto, CancellationToken cancellationToken = default);

    /// <exception cref="Exceptions.AppException">Super admin, or current password does not match.</exception>
    Task<bool> ChangePasswordAsync(int id, ChangePasswordDto dto, CancellationToken cancellationToken = default);

    /// <exception cref="Exceptions.AppException">The user is the super admin or the last active admin.</exception>
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
