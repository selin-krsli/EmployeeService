using System.Net;
using EmployeeService.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace EmployeeService.Middleware;

/// <summary>
/// Converts unhandled exceptions into a consistent JSON body: <c>{ message, field? }</c>.
/// </summary>
public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await WriteErrorAsync(context, ex);
        }
    }

    private async Task WriteErrorAsync(HttpContext context, Exception exception)
    {
        if (context.Response.HasStarted)
        {
            throw exception;
        }

        var (statusCode, message, field) = Map(exception);

        if (statusCode >= (int)HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception");
        }
        else
        {
            _logger.LogWarning(exception, "Handled application exception ({StatusCode})", statusCode);
        }

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        object body = string.IsNullOrEmpty(field)
            ? new { message }
            : new { message, field };

        await context.Response.WriteAsJsonAsync(body);
    }

    private static (int StatusCode, string Message, string? Field) Map(Exception exception) =>
        exception switch
        {
            AppException app => (app.StatusCode, app.Message, app.Field),
            InvalidOperationException invalid =>
                (StatusCodes.Status400BadRequest, invalid.Message, null),
            UnauthorizedAccessException unauthorized =>
                (StatusCodes.Status401Unauthorized, unauthorized.Message, null),
            DbUpdateException =>
                (StatusCodes.Status409Conflict, "Çakışan bir kayıt zaten mevcut.", null),
            _ =>
                (StatusCodes.Status500InternalServerError, "Beklenmeyen bir hata oluştu.", null)
        };
}
