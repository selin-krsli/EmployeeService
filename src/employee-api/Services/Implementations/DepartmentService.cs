using EmployeeService.Data;
using EmployeeService.DTOs.Common;
using EmployeeService.DTOs.Department;
using EmployeeService.Exceptions;
using EmployeeService.Services.Abstractions;
using EmployeeService.Models;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;

namespace EmployeeService.Services.Implementations;

public class DepartmentService : IDepartmentService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public DepartmentService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<PagedResult<DepartmentDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken = default)
    {
        (page, pageSize) = PageRequest.Normalize(page, pageSize);

        var query = _context.Departments.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(d => EF.Functions.Like(d.Name, term));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(d => d.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ProjectTo<DepartmentDto>(_mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);

        return new PagedResult<DepartmentDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public Task<DepartmentDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return ProjectDepartments()
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
    }

    public async Task<DepartmentDto> CreateAsync(DepartmentCreateDto dto, CancellationToken cancellationToken = default)
    {
        await EnsureUniqueNameAsync(dto.Name, excludeId: null, cancellationToken);

        var department = _mapper.Map<Department>(dto);

        _context.Departments.Add(department);
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(department.Id, cancellationToken))!;
    }

    public async Task<bool> UpdateAsync(int id, DepartmentUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var department = await _context.Departments
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        if (department is null)
        {
            return false;
        }

        await EnsureUniqueNameAsync(dto.Name, excludeId: id, cancellationToken);

        _mapper.Map(dto, department);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var department = await _context.Departments
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        if (department is null)
        {
            return false;
        }

        var hasEmployees = await _context.Employees
            .AnyAsync(e => e.DepartmentId == id, cancellationToken);

        if (hasEmployees)
        {
            throw new AppException(
                StatusCodes.Status409Conflict,
                "Bu birim personellere atanmış olduğu için silinemez.");
        }

        _context.Departments.Remove(department);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private IQueryable<DepartmentDto> ProjectDepartments()
    {
        return _context.Departments
            .AsNoTracking()
            .ProjectTo<DepartmentDto>(_mapper.ConfigurationProvider);
    }

    private async Task EnsureUniqueNameAsync(string name, int? excludeId, CancellationToken cancellationToken)
    {
        var normalized = name.Trim();
        var exists = await _context.Departments.AnyAsync(
            d => d.Name == normalized && (!excludeId.HasValue || d.Id != excludeId.Value),
            cancellationToken);

        if (exists)
        {
            throw new AppException(
                StatusCodes.Status409Conflict,
                "Bu isimde bir birim zaten kayıtlı.");
        }
    }
}
