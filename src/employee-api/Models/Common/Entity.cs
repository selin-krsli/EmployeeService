using Microsoft.EntityFrameworkCore.ValueGeneration;

namespace EmployeeService.Models.Common;
public abstract class Entity<TId> : IEntity<TId>
    where TId : notnull
{
    private static readonly SequentialGuidValueGenerator GuidGenerator = new();

    protected Entity()
    {
        if (typeof(TId) == typeof(Guid))
        {
            Id = (TId)(object)GuidGenerator.Next(null!);
        }
    }

    public TId Id { get; set; } = default!;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
