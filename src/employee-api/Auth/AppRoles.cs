namespace EmployeeService.Auth;

public static class AppRoles
{
    public const string Admin = "Admin";

    public const string Viewer = "Viewer";

    /// <summary>
    /// Comma-separated form for [Authorize(Roles = ...)]: any authenticated role may read.
    /// </summary>
    public const string AdminOrViewer = Admin + "," + Viewer;

    public const int AdminId = 1;

    public const int ViewerId = 2;
}
