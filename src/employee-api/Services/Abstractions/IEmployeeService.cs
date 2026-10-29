using EmployeeService.DTOs.Common;
using EmployeeService.DTOs.Employee;

namespace EmployeeService.Services.Abstractions;

public interface IEmployeeService
{
    Task<IReadOnlyList<EmployeeListDto>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<PagedResult<EmployeeListDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search,
        bool? isActive,
        CancellationToken cancellationToken = default);

    Task<EmployeeListDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<EmployeeListDto> CreateAsync(EmployeeCreateDto dto, CancellationToken cancellationToken = default);

    Task<bool> UpdateAsync(int id, EmployeeUpdateDto dto, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
