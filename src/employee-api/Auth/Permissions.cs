namespace EmployeeService.Auth;
public static class Permissions
{
    public static class Employees
    {
        public const string Read = "employees.read";
        public const string Create = "employees.create";
        public const string Update = "employees.update";
        public const string Delete = "employees.delete";
    }

    public static class Departments
    {
        public const string Read = "departments.read";
        public const string Create = "departments.create";
        public const string Update = "departments.update";
        public const string Delete = "departments.delete";
    }

    public static class Users
    {
        public const string Read = "users.read";
        public const string Create = "users.create";
        public const string Update = "users.update";
        public const string Delete = "users.delete";
    }

    public static class Roles
    {
        public const string Read = "roles.read";
    }

    public static readonly IReadOnlyList<string> All =
    [
        Employees.Read, Employees.Create, Employees.Update, Employees.Delete,
        Departments.Read, Departments.Create, Departments.Update, Departments.Delete,
        Users.Read, Users.Create, Users.Update, Users.Delete,
        Roles.Read
    ];
}
