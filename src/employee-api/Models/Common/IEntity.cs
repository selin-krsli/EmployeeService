namespace EmployeeService.Models.Common;

public interface IEntity<TId> : IAuditableEntity
    where TId : notnull
{
    TId Id { get; set; }
}
