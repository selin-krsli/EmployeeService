using EmployeeService.Auth;
using EmployeeService.Data;
using EmployeeService.DTOs.Common;
using EmployeeService.DTOs.Department;
using EmployeeService.DTOs.Employee;
using EmployeeService.DTOs.Roles;
using EmployeeService.DTOs.Users;
using EmployeeService.Services.Abstractions;
using EmployeeService.Exceptions;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using EmployeeService.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace EmployeeService.Services.Implementations;

public class UserService : IUserService
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;

    private readonly IMapper _mapper;

    public UserService(AppDbContext context, IPasswordHasher<User> passwordHasher, IMapper mapper)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _mapper = mapper;
    }

    public async Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .OrderBy(u => u.Id)
            .ProjectTo<UserDto>(_mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);
    }

    public async Task<PagedResult<UserDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken = default)
    {
        (page, pageSize) = PageRequest.Normalize(page, pageSize);

        var query = _context.Users.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(u =>
                EF.Functions.Like(u.UserName, term)
                || EF.Functions.Like(u.Email, term)
                || (u.Employee != null && (
                    EF.Functions.Like(u.Employee.FirstName, term)
                    || EF.Functions.Like(u.Employee.LastName, term)
                    || EF.Functions.Like(u.Employee.FirstName + " " + u.Employee.LastName, term)
                    || EF.Functions.Like(u.Employee.Email, term)
                    || EF.Functions.Like(u.Employee.EmployeeNumber, term)))
                || u.UserRoles.Any(ur => EF.Functions.Like(ur.Role.Name, term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(u => u.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ProjectTo<UserDto>(_mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);

        return new PagedResult<UserDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public Task<UserDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Users
            .AsNoTracking()
            .Where(u => u.Id == id)
            .ProjectTo<UserDto>(_mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<bool> UpdateAsync(int id, UserUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user is null)
        {
            return false;
        }

        EnsureNotSuperAdmin(user);

        var roleName = dto.Role.Trim();
        var role = await _context.Roles
            .FirstOrDefaultAsync(r => r.Name == roleName, cancellationToken)
            ?? throw new AppException(
                StatusCodes.Status400BadRequest,
                "Seçilen rol bulunamadı.",
                nameof(dto.Role));

        var losesAdmin = role.Id != AppRoles.AdminId || !dto.IsActive;
        if (losesAdmin && await IsLastActiveAdminAsync(user.Id, cancellationToken))
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "Sistemde en az bir aktif yönetici kalmalıdır; bu hesabın rolü veya durumu değiştirilemez.");
        }

        var userName = dto.UserName.Trim().ToLowerInvariant();
        if (userName != user.UserName
            && await _context.Users.AnyAsync(u => u.UserName == userName && u.Id != user.Id, cancellationToken))
        {
            throw new AppException(
                StatusCodes.Status409Conflict,
                "Bu kullanıcı adı zaten kullanılıyor.",
                nameof(dto.UserName));
        }

        user.UserName = userName;
        user.IsActive = dto.IsActive;

        var hasRole = user.UserRoles.Any(ur => ur.RoleId == role.Id);
        _context.UserRoles.RemoveRange(user.UserRoles.Where(ur => ur.RoleId != role.Id).ToList());
        if (!hasRole)
        {
            user.UserRoles.Add(new UserRole { RoleId = role.Id });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ChangePasswordAsync(
        int id,
        ChangePasswordDto dto,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null)
        {
            return false;
        }

        EnsureNotSuperAdmin(user);

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.CurrentPassword);
        if (verification == PasswordVerificationResult.Failed)
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "Eski parola hatalı.",
                "CurrentPassword");
        }

        if (dto.CurrentPassword == dto.NewPassword)
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "Yeni parola eski parola ile aynı olamaz.",
                "NewPassword");
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user is null)
        {
            return false;
        }

        EnsureNotSuperAdmin(user);

        if (await IsLastActiveAdminAsync(user.Id, cancellationToken))
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "Son aktif yönetici silinemez.");
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static void EnsureNotSuperAdmin(User user)
    {
        if (string.Equals(user.Email, DbSeeder.AdminEmail, StringComparison.OrdinalIgnoreCase))
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "Süper yönetici hesabı değiştirilemez.");
        }
    }

    private async Task<bool> IsLastActiveAdminAsync(int userId, CancellationToken cancellationToken)
    {
        var activeAdminIds = await _context.UserRoles
            .Where(ur => ur.RoleId == AppRoles.AdminId && ur.User.IsActive)
            .Select(ur => ur.UserId)
            .ToListAsync(cancellationToken);

        return activeAdminIds.Count == 1 && activeAdminIds[0] == userId;
    }
}
