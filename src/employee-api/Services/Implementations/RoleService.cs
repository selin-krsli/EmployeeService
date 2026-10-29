using EmployeeService.Auth;
using EmployeeService.Data;
using EmployeeService.DTOs.Common;
using EmployeeService.DTOs.Department;
using EmployeeService.DTOs.Employee;
using EmployeeService.DTOs.Roles;
using EmployeeService.DTOs.Users;
using EmployeeService.Services.Abstractions;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;

namespace EmployeeService.Services.Implementations;

public class RoleService : IRoleService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public RoleService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<IReadOnlyList<RoleDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var roles = await _context.Roles
            .AsNoTracking()
            .OrderBy(r => r.Id)
            .ProjectTo<RoleDto>(_mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);

        var claimsByRole = (await _context.RoleClaims
                .AsNoTracking()
                .Where(rc => rc.ClaimType == AppClaimTypes.Permission)
                .Select(rc => new { rc.RoleId, rc.ClaimValue })
                .ToListAsync(cancellationToken))
            .ToLookup(rc => rc.RoleId, rc => rc.ClaimValue);

        foreach (var role in roles)
        {
            role.Description = RolePermissions.GetDescription(role.Name);
            role.Permissions = RolePermissions.ToModulePermissions(claimsByRole[role.Id].ToHashSet());
        }

        return roles;
    }

    public async Task<PagedResult<RoleDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken = default)
    {
        (page, pageSize) = PageRequest.Normalize(page, pageSize);

        var roles = await GetAllAsync(cancellationToken);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            roles = roles
                .Where(role =>
                    role.Name.Contains(term, StringComparison.CurrentCultureIgnoreCase)
                    || (role.Description?.Contains(term, StringComparison.CurrentCultureIgnoreCase) ?? false))
                .ToList();
        }

        return new PagedResult<RoleDto>
        {
            Items = roles.Skip((page - 1) * pageSize).Take(pageSize).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = roles.Count
        };
    }
}
