using Microsoft.EntityFrameworkCore.ValueGeneration;

namespace EmployeeService.Models.Common;

/// <summary>
/// Base class for all persisted entities: key plus audit timestamps.
/// <see cref="CreatedAt"/> and <see cref="UpdatedAt"/> are stamped by <c>AppDbContext.SaveChanges</c>.
/// </summary>
public abstract class Entity<TId> : IEntity<TId>
    where TId : notnull
{
    // The generator's counter is static, so one shared instance keeps values ordered across entities.
    private static readonly SequentialGuidValueGenerator GuidGenerator = new();

    protected Entity()
    {
        if (typeof(TId) == typeof(Guid))
        {
            // Sequential GUIDs avoid the page splits that random GUID clustered keys cause in SQL Server.
            Id = (TId)(object)GuidGenerator.Next(null!);
        }
    }

    public TId Id { get; set; } = default!;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
