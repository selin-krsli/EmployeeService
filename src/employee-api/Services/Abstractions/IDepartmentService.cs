using EmployeeService.DTOs.Common;
using EmployeeService.DTOs.Department;

namespace EmployeeService.Services.Abstractions;

public interface IDepartmentService
{
    Task<PagedResult<DepartmentDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken = default);

    Task<DepartmentDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<DepartmentDto> CreateAsync(DepartmentCreateDto dto, CancellationToken cancellationToken = default);

    Task<bool> UpdateAsync(int id, DepartmentUpdateDto dto, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
