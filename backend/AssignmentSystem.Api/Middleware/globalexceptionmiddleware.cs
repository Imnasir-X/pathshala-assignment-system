using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace AssignmentSystem.Api.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
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
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        var (statusCode, title) = ex switch
        {
            Exceptions.ValidationException => (HttpStatusCode.BadRequest, "Validation Error"),
            Exceptions.ForbiddenException => (HttpStatusCode.Forbidden, "Forbidden"),
            Exceptions.NotFoundException => (HttpStatusCode.NotFound, "Not Found"),
            Exceptions.DeadlinePassedException => (HttpStatusCode.BadRequest, "Deadline Passed"),
            Exceptions.DuplicateSubmissionException => (HttpStatusCode.Conflict, "Duplicate Submission"),
            Exceptions.InvalidMarksException => (HttpStatusCode.BadRequest, "Invalid Marks"),
            Exceptions.BusinessRuleException => (HttpStatusCode.BadRequest, "Business Rule Violation"),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "Unauthorized"),
            _ => (HttpStatusCode.InternalServerError, "Internal Server Error")
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
        }
        else
        {
            _logger.LogWarning("Handled exception ({StatusCode}): {Message}", statusCode, ex.Message);
        }

        var problemDetails = new ProblemDetails
        {
            Status = (int)statusCode,
            Title = title,
            Detail = statusCode == HttpStatusCode.InternalServerError
                ? "An internal server error occurred. Please try again later."
                : ex.Message,
            Instance = context.Request.Path
        };

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/problem+json";

        var json = JsonSerializer.Serialize(problemDetails, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
