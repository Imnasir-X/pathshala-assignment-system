using Microsoft.EntityFrameworkCore;
using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Models;
using AssignmentSystem.Api.Exceptions;

namespace AssignmentSystem.Api.Services;

public interface IAssignmentService
{
    Task<List<Assignment>> GetAssignmentsAsync(int? teacherId, int? studentId, bool adminView, int page = 1, int pageSize = 20);
    Task<Assignment?> GetByIdAsync(int id);
    Task<Assignment> CreateAsync(CreateAssignmentInput input);
    Task<Assignment> UpdateAsync(int id, UpdateAssignmentInput input, int currentUserId);
    Task<bool> DeleteAsync(int id, int currentUserId);
}

public record CreateAssignmentInput(string Title, string? Description, int TeacherSubjectAssignmentId, DateTime Deadline, int MaxMarks, AssignmentStatus Status, int CurrentUserId);
public record UpdateAssignmentInput(string? Title, string? Description, DateTime? Deadline, int? MaxMarks, AssignmentStatus? Status, int CurrentUserId);

public class AssignmentService : IAssignmentService
{
    private readonly AppDbContext _context;
    private readonly ILogger<AssignmentService> _logger;

    public AssignmentService(AppDbContext context, ILogger<AssignmentService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<Assignment>> GetAssignmentsAsync(int? teacherId, int? studentId, bool adminView, int page = 1, int pageSize = 20)
    {
        var query = _context.Assignments
            .Include(a => a.TeacherSubjectAssignment)
                .ThenInclude(t => t.Teacher)
            .Include(a => a.TeacherSubjectAssignment)
                .ThenInclude(t => t.Subject)
            .Include(a => a.TeacherSubjectAssignment)
                .ThenInclude(t => t.ClassCourse)
            .AsNoTracking()
            .AsQueryable();

        if (adminView)
        {
            // Admin sees all
        }
        else if (teacherId.HasValue)
        {
            query = query.Where(a => a.TeacherSubjectAssignment.TeacherId == teacherId.Value);
        }
        else if (studentId.HasValue)
        {
            // Students only see published assignments for their class
            var studentClassIds = await _context.StudentEnrollments
                .Where(e => e.StudentId == studentId.Value)
                .Select(e => e.ClassCourseId)
                .ToListAsync();

            query = query.Where(a =>
                a.Status == AssignmentStatus.Published &&
                studentClassIds.Contains(a.TeacherSubjectAssignment.ClassCourseId));
        }

        return await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<Assignment?> GetByIdAsync(int id)
    {
        return await _context.Assignments
            .Include(a => a.TeacherSubjectAssignment)
                .ThenInclude(t => t.Teacher)
            .Include(a => a.TeacherSubjectAssignment)
                .ThenInclude(t => t.Subject)
            .Include(a => a.TeacherSubjectAssignment)
                .ThenInclude(t => t.ClassCourse)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    public async Task<Assignment> CreateAsync(CreateAssignmentInput input)
    {
        var tsa = await _context.TeacherSubjectAssignments
            .FirstOrDefaultAsync(t => t.Id == input.TeacherSubjectAssignmentId)
            ?? throw new NotFoundException("Teacher-subject assignment not found.");

        if (tsa.TeacherId != input.CurrentUserId)
            throw new ForbiddenException("You can only create assignments for your own class+subject assignments.");

        if (input.MaxMarks <= 0)
            throw new ValidationException("Max marks must be greater than 0.");

        if (input.Deadline <= DateTime.UtcNow)
            throw new ValidationException("Deadline must be in the future.");

        var assignment = new Assignment
        {
            Title = input.Title,
            Description = input.Description,
            TeacherSubjectAssignmentId = input.TeacherSubjectAssignmentId,
            Deadline = input.Deadline,
            MaxMarks = input.MaxMarks,
            Status = input.Status,
            CreatedAt = DateTime.UtcNow
        };

        _context.Assignments.Add(assignment);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Assignment {Title} created by teacher {TeacherId}", input.Title, input.CurrentUserId);
        return assignment;
    }

    public async Task<Assignment> UpdateAsync(int id, UpdateAssignmentInput input, int currentUserId)
    {
        var assignment = await _context.Assignments
            .Include(a => a.TeacherSubjectAssignment)
            .FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new NotFoundException($"Assignment with id {id} not found.");

        if (assignment.TeacherSubjectAssignment.TeacherId != currentUserId)
            throw new ForbiddenException("You can only update your own assignments.");

        if (input.Title != null) assignment.Title = input.Title;
        if (input.Description != null) assignment.Description = input.Description;
        if (input.Deadline.HasValue) assignment.Deadline = input.Deadline.Value;
        if (input.MaxMarks.HasValue)
        {
            if (input.MaxMarks.Value <= 0)
                throw new ValidationException("Max marks must be greater than 0.");
            assignment.MaxMarks = input.MaxMarks.Value;
        }
        if (input.Status.HasValue) assignment.Status = input.Status.Value;

        assignment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return assignment;
    }

    public async Task<bool> DeleteAsync(int id, int currentUserId)
    {
        var assignment = await _context.Assignments
            .Include(a => a.TeacherSubjectAssignment)
            .FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new NotFoundException($"Assignment with id {id} not found.");

        if (assignment.TeacherSubjectAssignment.TeacherId != currentUserId)
            throw new ForbiddenException("You can only delete your own assignments.");

        _context.Assignments.Remove(assignment);
        await _context.SaveChangesAsync();
        return true;
    }
}
