using EmployeeService.DTOs.Common;
using EmployeeService.DTOs.Roles;

namespace EmployeeService.Services.Abstractions;

public interface IRoleService
{
    Task<IReadOnlyList<RoleDto>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<PagedResult<RoleDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken = default);
}
