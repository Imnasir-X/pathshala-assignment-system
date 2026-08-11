using Microsoft.EntityFrameworkCore;
using BCrypt.Net;
using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Models;
using AssignmentSystem.Api.Exceptions;

namespace AssignmentSystem.Api.Services;

public interface IAuthService
{
    Task<(string token, User user)> LoginAsync(string email, string password);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(AppDbContext context, IJwtService jwtService, ILogger<AuthService> logger)
    {
        _context = context;
        _jwtService = jwtService;
        _logger = logger;
    }

    public async Task<(string token, User user)> LoginAsync(string email, string password)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            _logger.LogWarning("Login failed for email {Email}: user not found", email);
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            _logger.LogWarning("Login failed for email {Email}: invalid password", email);
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        _logger.LogInformation("User {Email} logged in successfully with role {Role}", email, user.Role);
        var token = _jwtService.GenerateToken(user);
        return (token, user);
    }
}
