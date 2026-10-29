namespace EmployeeService.Exceptions;

/// <summary>
/// Domain / application error that the global exception middleware turns into an HTTP response.
/// </summary>
public sealed class AppException : Exception
{
    public AppException(int statusCode, string message, string? field = null)
        : base(message)
    {
        StatusCode = statusCode;
        Field = field;
    }

    public int StatusCode { get; }

    /// <summary>Optional request field name for the client (e.g. validation / conflict target).</summary>
    public string? Field { get; }
}
