namespace EmployeeService.DTOs.Roles;

public class ModulePermissionDto
{
    public string Module { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public bool CanRead { get; set; }

    public bool CanCreate { get; set; }

    public bool CanUpdate { get; set; }

    public bool CanDelete { get; set; }
}
