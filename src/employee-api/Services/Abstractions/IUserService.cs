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

    Task<bool> UpdateAsync(int id, UserUpdateDto dto, CancellationToken cancellationToken = default);

    Task<bool> ChangePasswordAsync(int id, ChangePasswordDto dto, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
