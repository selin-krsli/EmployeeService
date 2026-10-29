using EmployeeService.Auth;
using EmployeeService.Models;
using EmployeeService.Models.Common;
using Microsoft.EntityFrameworkCore;

namespace EmployeeService.Data;

public class AppDbContext : DbContext
{
    private static readonly DateTime SeedTimestamp = new(2026, 10, 27, 0, 0, 0, DateTimeKind.Utc);

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ApplyAuditTimestamps();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        ApplyAuditTimestamps();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    /// <summary>
    /// Added entities get <c>CreatedAt</c>, modified ones get <c>UpdatedAt</c> (both UTC).
    /// Overriding the <c>acceptAllChangesOnSuccess</c> overloads covers the parameterless
    /// SaveChanges / SaveChangesAsync calls too, since they delegate to these.
    /// </summary>
    private void ApplyAuditTimestamps()
    {
        // Property edits are only detected lazily; without this a changed entity may still read as Unchanged.
        ChangeTracker.DetectChanges();

        var now = DateTime.Now;

        foreach (var entry in ChangeTracker.Entries<IAuditableEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    break;

                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    entry.Property(e => e.CreatedAt).IsModified = false;
                    break;
            }
        }
    }

    public DbSet<Employee> Employees => Set<Employee>();

    public DbSet<Address> Addresses => Set<Address>();

    public DbSet<Department> Departments => Set<Department>();

    public DbSet<User> Users => Set<User>();

    public DbSet<Role> Roles => Set<Role>();

    public DbSet<UserRole> UserRoles => Set<UserRole>();

    public DbSet<RoleClaim> RoleClaims => Set<RoleClaim>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");

            entity.HasKey(u => u.Id);

            entity.Property(u => u.UserName)
                .IsRequired()
                .HasMaxLength(50);

            entity.HasIndex(u => u.UserName)
                .IsUnique()
                .HasDatabaseName("IX_Users_UserName");

            entity.HasIndex(u => u.EmployeeId)
                .IsUnique()
                .HasDatabaseName("IX_Users_EmployeeId");

            entity.HasOne(u => u.Employee)
                .WithMany()
                .HasForeignKey(u => u.EmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(256);

            entity.HasIndex(u => u.Email)
                .IsUnique()
                .HasDatabaseName("IX_Users_Email");

            entity.Property(u => u.PasswordHash)
                .IsRequired()
                .HasMaxLength(512);

            entity.Property(u => u.IsActive)
                .IsRequired()
                .HasDefaultValue(true);
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("Roles");

            entity.HasKey(r => r.Id);

            entity.Property(r => r.Name)
                .IsRequired()
                .HasMaxLength(50);

            entity.HasIndex(r => r.Name)
                .IsUnique()
                .HasDatabaseName("IX_Roles_Name");

            // Seed rows must be deterministic, so the audit timestamp is a fixed value, not UtcNow.
            entity.HasData(
                new Role { Id = AppRoles.AdminId, Name = AppRoles.Admin, CreatedAt = SeedTimestamp },
                new Role { Id = AppRoles.ViewerId, Name = AppRoles.Viewer, CreatedAt = SeedTimestamp });
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.ToTable("UserRoles");

            entity.HasKey(ur => new { ur.UserId, ur.RoleId });

            entity.HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RoleClaim>(entity =>
        {
            entity.ToTable("RoleClaims");

            entity.HasKey(rc => rc.Id);

            entity.Property(rc => rc.ClaimType)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(rc => rc.ClaimValue)
                .IsRequired()
                .HasMaxLength(100);

            entity.HasIndex(rc => new { rc.RoleId, rc.ClaimType, rc.ClaimValue })
                .IsUnique()
                .HasDatabaseName("IX_RoleClaims_RoleId_ClaimType_ClaimValue");

            entity.HasOne(rc => rc.Role)
                .WithMany(r => r.RoleClaims)
                .HasForeignKey(rc => rc.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            var id = 0;
            entity.HasData(RolePermissions.DefaultClaims
                .SelectMany(role => role.Value.Select(permission => new RoleClaim
                {
                    Id = ++id,
                    RoleId = role.Key,
                    ClaimType = AppClaimTypes.Permission,
                    ClaimValue = permission,
                    CreatedAt = SeedTimestamp
                }))
                .ToArray());
        });

        modelBuilder.Entity<Department>(entity =>
        {
            entity.ToTable("Departments");

            entity.HasKey(d => d.Id);

            entity.Property(d => d.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.HasIndex(d => d.Name)
                .IsUnique()
                .HasDatabaseName("IX_Departments_Name");
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("Employees");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.EmployeeNumber)
                .IsRequired()
                .HasMaxLength(20);

            entity.HasIndex(e => e.EmployeeNumber)
                .IsUnique()
                .HasDatabaseName("IX_Employees_EmployeeNumber");

            entity.Property(e => e.IdentityNumber)
                .IsRequired()
                .HasMaxLength(11);

            entity.HasIndex(e => e.IdentityNumber)
                .IsUnique()
                .HasDatabaseName("IX_Employees_IdentityNumber");

            entity.Property(e => e.FirstName)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(e => e.LastName)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(e => e.Email)
                .IsRequired()
                .HasMaxLength(256);

            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(20);

            entity.Property(e => e.JobTitle)
                .HasMaxLength(100);

            entity.Property(e => e.IsActive)
                .IsRequired()
                .HasDefaultValue(true);

            entity.Property(e => e.DepartmentId)
                .IsRequired();

            entity.HasOne(e => e.Department)
                .WithMany(d => d.Employees)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Addresses)
                .WithOne(a => a.Employee)
                .HasForeignKey(a => a.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Address>(entity =>
        {
            entity.ToTable("Addresses");

            entity.HasKey(a => a.Id);

            entity.Property(a => a.AddressType)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(a => a.City)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(a => a.District)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(a => a.PostalCode)
                .HasMaxLength(10);

            entity.Property(a => a.FullAddress)
                .IsRequired()
                .HasMaxLength(130);

            entity.Property(a => a.Country)
                .IsRequired()
                .HasMaxLength(100);
        });
    }
}
