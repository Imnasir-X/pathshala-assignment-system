using Microsoft.EntityFrameworkCore;
using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Models;
using AssignmentSystem.Api.Exceptions;

namespace AssignmentSystem.Api.Services;

public interface IUserService
{
    Task<List<User>> GetAllAsync(int page = 1, int pageSize = 20);
    Task<User?> GetByIdAsync(int id);
    Task<User> CreateAsync(string fullName, string email, string password, string role);
    Task<User> UpdateAsync(int id, string fullName, string email, string role);
    Task<bool> DeleteAsync(int id);
}

public class UserService : IUserService
{
    private readonly AppDbContext _context;
    private readonly ILogger<UserService> _logger;

    public UserService(AppDbContext context, ILogger<UserService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<User>> GetAllAsync(int page = 1, int pageSize = 20)
    {
        return await _context.Users
            .OrderBy(u => u.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<User?> GetByIdAsync(int id)
    {
        return await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<User> CreateAsync(string fullName, string email, string password, string role)
    {
        if (await _context.Users.AnyAsync(u => u.Email == email))
            throw new BusinessRuleException("A user with this email already exists.");

        if (!Enum.TryParse<UserRole>(role, true, out var userRole))
            throw new ValidationException($"Invalid role: {role}. Must be Admin, Teacher, or Student.");

        var user = new User
        {
            FullName = fullName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = userRole,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Created user {Email} with role {Role}", email, userRole);
        return user;
    }

    public async Task<User> UpdateAsync(int id, string fullName, string email, string role)
    {
        var user = await _context.Users.FindAsync(id)
            ?? throw new NotFoundException($"User with id {id} not found.");

        if (await _context.Users.AnyAsync(u => u.Email == email && u.Id != id))
            throw new BusinessRuleException("A user with this email already exists.");

        if (!Enum.TryParse<UserRole>(role, true, out var userRole))
            throw new ValidationException($"Invalid role: {role}.");

        user.FullName = fullName;
        user.Email = email;
        user.Role = userRole;

        await _context.SaveChangesAsync();
        return user;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var user = await _context.Users.FindAsync(id)
            ?? throw new NotFoundException($"User with id {id} not found.");

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        return true;
    }
}
