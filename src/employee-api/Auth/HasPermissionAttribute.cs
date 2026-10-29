using Microsoft.AspNetCore.Authorization;

namespace EmployeeService.Auth;

/// <summary>
/// Requires the caller's token to carry the given permission claim (e.g. <c>employees.create</c>).
/// Missing token returns 401, missing permission returns 403.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class HasPermissionAttribute : AuthorizeAttribute
{
    public HasPermissionAttribute(string permission) : base(permission)
    {
    }
}
