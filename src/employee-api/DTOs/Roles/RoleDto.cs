namespace EmployeeService.DTOs.Roles;

public class RoleDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int UserCount { get; set; }

    public List<ModulePermissionDto> Permissions { get; set; } = new();
}
