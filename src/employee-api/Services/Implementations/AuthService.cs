using EmployeeService.Auth;
using EmployeeService.Data;
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

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ITokenService _tokenService;

    private readonly IMapper _mapper;

    public AuthService(
        AppDbContext context,
        IPasswordHasher<User> passwordHasher,
        ITokenService tokenService,
        IMapper mapper)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _mapper = mapper;
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default)
    {
        var login = dto.UserName.Trim().ToLowerInvariant();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.UserName == login || u.Email == login, cancellationToken);

        if (user is null)
        {
            return null;
        }

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return null;
        }

        if (!user.IsActive)
        {
            throw new AppException(
                StatusCodes.Status403Forbidden,
                "Kullanıcı aktif değildir.");
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var userDto = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == user.Id)
            .ProjectTo<UserDto>(_mapper.ConfigurationProvider)
            .FirstAsync(cancellationToken);

        var permissions = await _context.RoleClaims
            .AsNoTracking()
            .Where(rc => rc.ClaimType == AppClaimTypes.Permission
                && rc.Role.UserRoles.Any(ur => ur.UserId == user.Id))
            .Select(rc => rc.ClaimValue)
            .Distinct()
            .ToListAsync(cancellationToken);

        var (accessToken, expiresAt) = _tokenService.CreateAccessToken(userDto, permissions);

        return new AuthResponseDto
        {
            AccessToken = accessToken,
            ExpiresAt = expiresAt,
            User = userDto
        };
    }

    public async Task<UserDto> RegisterAsync(RegisterDto dto, bool callerIsAdmin, CancellationToken cancellationToken = default)
    {
        var roleName = dto.Role.Trim();

        var role = await _context.Roles
            .FirstOrDefaultAsync(r => r.Name == roleName, cancellationToken)
            ?? throw new AppException(
                StatusCodes.Status400BadRequest,
                "Seçilen rol bulunamadı.",
                nameof(dto.Role));

        // Only an admin may grant Admin; the very first account is the bootstrap exception.
        if (role.Name == AppRoles.Admin && !callerIsAdmin
            && await _context.Users.AnyAsync(cancellationToken))
        {
            throw new AppException(
                StatusCodes.Status403Forbidden,
                "Yalnızca yöneticiler Admin rolünde kullanıcı oluşturabilir.");
        }

        var employee = await _context.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == dto.EmployeeId, cancellationToken)
            ?? throw new AppException(
                StatusCodes.Status400BadRequest,
                "Seçilen personel bulunamadı.",
                nameof(dto.EmployeeId));

        var userName = dto.UserName.Trim().ToLowerInvariant();
        var email = employee.Email.Trim().ToLowerInvariant();

        if (await _context.Users.AnyAsync(u => u.EmployeeId == employee.Id, cancellationToken))
        {
            throw new AppException(
                StatusCodes.Status409Conflict,
                "Bu personelin zaten bir kullanıcı hesabı var.",
                nameof(dto.EmployeeId));
        }

        if (await _context.Users.AnyAsync(u => u.UserName == userName, cancellationToken))
        {
            throw new AppException(
                StatusCodes.Status409Conflict,
                "Bu kullanıcı adı zaten kullanılıyor.",
                nameof(dto.UserName));
        }

        if (await _context.Users.AnyAsync(u => u.Email == email, cancellationToken))
        {
            throw new AppException(
                StatusCodes.Status409Conflict,
                "Bu personelin e-posta adresiyle kayıtlı başka bir kullanıcı var.",
                "Email");
        }

        var user = new User
        {
            UserName = userName,
            Email = email,
            EmployeeId = employee.Id,
            IsActive = true,
            UserRoles = { new UserRole { RoleId = role.Id } }
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        return await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == user.Id)
            .ProjectTo<UserDto>(_mapper.ConfigurationProvider)
            .FirstAsync(cancellationToken);
    }
}
