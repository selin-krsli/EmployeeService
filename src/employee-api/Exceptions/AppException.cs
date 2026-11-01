namespace EmployeeService.Exceptions;
public sealed class AppException : Exception
{
    public AppException(int statusCode, string message, string? field = null)
        : base(message)
    {
        StatusCode = statusCode;
        Field = field;
    }

    public int StatusCode { get; }
    public string? Field { get; }
}
