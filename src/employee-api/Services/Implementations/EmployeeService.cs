using EmployeeService.Data;
using EmployeeService.DTOs.Common;
using EmployeeService.DTOs.Department;
using EmployeeService.DTOs.Employee;
using EmployeeService.DTOs.Roles;
using EmployeeService.DTOs.Users;
using EmployeeService.Exceptions;
using EmployeeService.Services.Abstractions;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using EmployeeService.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeService.Services.Implementations;

public class EmployeeService : IEmployeeService
{
    private readonly AppDbContext _context;

    private readonly IMapper _mapper;

    public EmployeeService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<IReadOnlyList<EmployeeListDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Employees
            .AsNoTracking()
            .OrderBy(e => e.Id)
            .ProjectTo<EmployeeListDto>(_mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);
    }

    public async Task<PagedResult<EmployeeListDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search,
        bool? isActive,
        CancellationToken cancellationToken = default)
    {
        (page, pageSize) = PageRequest.Normalize(page, pageSize);

        var query = _context.Employees.AsNoTracking().AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(e => e.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(e =>
                EF.Functions.Like(e.FirstName, term)
                || EF.Functions.Like(e.LastName, term)
                || EF.Functions.Like(e.FirstName + " " + e.LastName, term)
                || EF.Functions.Like(e.EmployeeNumber, term)
                || EF.Functions.Like(e.Department.Name, term)
                || (e.JobTitle != null && EF.Functions.Like(e.JobTitle, term))
                || EF.Functions.Like(e.Email, term)
                || (e.PhoneNumber != null && EF.Functions.Like(e.PhoneNumber, term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(e => e.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ProjectTo<EmployeeListDto>(_mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);

        return new PagedResult<EmployeeListDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public Task<EmployeeListDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Employees
            .AsNoTracking()
            .Where(e => e.Id == id)
            .ProjectTo<EmployeeListDto>(_mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<EmployeeListDto> CreateAsync(EmployeeCreateDto dto, CancellationToken cancellationToken = default)
    {
        EnsureValidAddresses(dto.Addresses);
        EnsureMinimumHireAge(dto.DateOfBirth, dto.HireDate);
        await EnsureUniqueIdentityAsync(dto.IdentityNumber, excludeId: null, cancellationToken);

        var employee = _mapper.Map<Employee>(dto);
        employee.EmployeeNumber = GenerateEmployeeNumber();

        _context.Employees.Add(employee);
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(employee.Id, cancellationToken))!;
    }

    public async Task<bool> UpdateAsync(int id, EmployeeUpdateDto dto, CancellationToken cancellationToken = default)
    {
        EnsureValidAddresses(dto.Addresses);
        EnsureMinimumHireAge(dto.DateOfBirth, dto.HireDate);

        var employee = await _context.Employees
            .Include(e => e.Addresses)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (employee is null)
        {
            return false;
        }

        await EnsureUniqueIdentityAsync(dto.IdentityNumber, excludeId: id, cancellationToken);

        _mapper.Map(dto, employee);
        SyncAddresses(employee, dto.Addresses);
        await SyncLinkedUserEmailAsync(employee, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (employee is null)
        {
            return false;
        }

        var hasUser = await _context.Users.AnyAsync(u => u.EmployeeId == id, cancellationToken);
        if (hasUser)
        {
            throw new AppException(
                StatusCodes.Status409Conflict,
                "Bu personele ait kullanıcı bulunmakta, önce onu siliniz.");
        }

        _context.Employees.Remove(employee);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    /// <summary>
    /// The account keeps its own active flag. Only the login e-mail follows the personnel record.
    /// </summary>
    private async Task SyncLinkedUserEmailAsync(Employee employee, CancellationToken cancellationToken)
    {
        var linkedUser = await _context.Users
            .FirstOrDefaultAsync(u => u.EmployeeId == employee.Id, cancellationToken);

        if (linkedUser is null)
        {
            return;
        }

        var email = employee.Email.Trim().ToLowerInvariant();
        if (string.Equals(linkedUser.Email, email, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var taken = await _context.Users.AnyAsync(
            u => u.Email == email && u.Id != linkedUser.Id,
            cancellationToken);

        if (taken)
        {
            throw new AppException(
                StatusCodes.Status409Conflict,
                "Bu e-posta adresi başka bir kullanıcıda kayıtlı.",
                nameof(EmployeeUpdateDto.Email));
        }

        linkedUser.Email = email;
    }

    private static string GenerateEmployeeNumber()
    {
        return $"EMP-{Guid.NewGuid().ToString("N")[..5].ToUpperInvariant()}";
    }

    /// <summary>Hire date must be at least 15 years after the birth date.</summary>
    private static void EnsureMinimumHireAge(DateOnly dateOfBirth, DateOnly hireDate)
    {
        if (hireDate < dateOfBirth.AddYears(15))
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "Kişinin yaşı 15'ten küçük olmamalıdır.",
                nameof(EmployeeCreateDto.HireDate));
        }
    }

    /// <summary>
    /// At most one Home and one Work address (max two total, distinct types).
    /// </summary>
    private static void EnsureValidAddresses(IReadOnlyCollection<AddressUpsertDto> addresses)
    {
        if (addresses.Count > 2)
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "Bir personelin en fazla bir Ev ve bir İş adresi olabilir.");
        }

        if (addresses.Select(a => a.AddressType).Distinct().Count() != addresses.Count)
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "Her adres tipi (Ev / İş) personel başına yalnızca bir kez kullanılabilir.");
        }
    }

    private async Task EnsureUniqueIdentityAsync(
        string identityNumber,
        int? excludeId,
        CancellationToken cancellationToken)
    {
        var normalized = identityNumber.Trim();
        var exists = await _context.Employees.AnyAsync(
            e => e.IdentityNumber == normalized && (!excludeId.HasValue || e.Id != excludeId.Value),
            cancellationToken);

        if (exists)
        {
            throw new AppException(
                StatusCodes.Status409Conflict,
                "Bu TC kimlik numarasıyla kayıtlı bir personel zaten var.",
                nameof(EmployeeCreateDto.IdentityNumber));
        }
    }

    /// <summary>
    /// Updates existing address rows in place (so EF marks them Modified → UpdatedAt is stamped),
    /// adds missing types, and removes types that are no longer in the payload.
    /// Matching is by <see cref="AddressType"/> (at most one Home and one Work per employee).
    /// </summary>
    private void SyncAddresses(Employee employee, IReadOnlyCollection<AddressUpsertDto> incoming)
    {
        var remaining = employee.Addresses.ToDictionary(a => a.AddressType);

        foreach (var dto in incoming)
        {
            if (remaining.Remove(dto.AddressType, out var existing))
            {
                _mapper.Map(dto, existing);
            }
            else
            {
                employee.Addresses.Add(_mapper.Map<Address>(dto));
            }
        }

        if (remaining.Count > 0)
        {
            _context.Addresses.RemoveRange(remaining.Values);
        }
    }
}
