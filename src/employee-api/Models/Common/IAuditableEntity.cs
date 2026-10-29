namespace EmployeeService.Models.Common;

/// <summary>
/// Non-generic view of the audit timestamps so <c>AppDbContext</c> can stamp every entity
/// regardless of its key type.
/// </summary>
public interface IAuditableEntity
{
    DateTime CreatedAt { get; set; }

    DateTime? UpdatedAt { get; set; }
}
