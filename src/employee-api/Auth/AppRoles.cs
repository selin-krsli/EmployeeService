namespace EmployeeService.Auth;

public static class AppRoles
{
    public const string Admin = "Admin";

    public const string Viewer = "Viewer";
    public const string AdminOrViewer = Admin + "," + Viewer;

    public const int AdminId = 1;

    public const int ViewerId = 2;
}
