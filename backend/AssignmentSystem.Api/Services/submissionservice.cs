using Microsoft.EntityFrameworkCore;
using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Models;
using AssignmentSystem.Api.Exceptions;

namespace AssignmentSystem.Api.Services;

public interface ISubmissionService
{
    Task<List<Submission>> GetSubmissionsForAssignmentAsync(int assignmentId, int currentUserId, bool isAdmin, int page = 1, int pageSize = 20);
    Task<List<Submission>> GetMySubmissionsAsync(int studentId, int page = 1, int pageSize = 20);
    Task<Submission?> GetByIdAsync(int id);
    Task<Submission> SubmitAsync(int assignmentId, int studentId, string content);
    Task<Submission> UpdateAsync(int submissionId, int studentId, string content);
    Task<Submission> GradeAsync(int submissionId, int teacherId, decimal marks, string? feedback, bool isAdmin);
    Task<Submission> UpdateStatusAsync(int submissionId, int teacherId, SubmissionStatus status, bool isAdmin);
}

public class SubmissionService : ISubmissionService
{
    private readonly AppDbContext _context;
    private readonly ILogger<SubmissionService> _logger;

    public SubmissionService(AppDbContext context, ILogger<SubmissionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<Submission>> GetSubmissionsForAssignmentAsync(int assignmentId, int currentUserId, bool isAdmin, int page = 1, int pageSize = 20)
    {
        var assignment = await _context.Assignments
            .Include(a => a.TeacherSubjectAssignment)
            .FirstOrDefaultAsync(a => a.Id == assignmentId)
            ?? throw new NotFoundException($"Assignment with id {assignmentId} not found.");

        if (!isAdmin && assignment.TeacherSubjectAssignment.TeacherId != currentUserId)
            throw new ForbiddenException("You can only view submissions for your own assignments.");

        return await _context.Submissions
            .Include(s => s.Student)
            .Include(s => s.Assignment)
            .Where(s => s.AssignmentId == assignmentId)
            .OrderByDescending(s => s.SubmittedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<List<Submission>> GetMySubmissionsAsync(int studentId, int page = 1, int pageSize = 20)
    {
        return await _context.Submissions
            .Include(s => s.Assignment)
                .ThenInclude(a => a.TeacherSubjectAssignment)
                    .ThenInclude(t => t.Subject)
            .Where(s => s.StudentId == studentId)
            .OrderByDescending(s => s.SubmittedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<Submission?> GetByIdAsync(int id)
    {
        return await _context.Submissions
            .Include(s => s.Assignment)
                .ThenInclude(a => a.TeacherSubjectAssignment)
            .Include(s => s.Student)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<Submission> SubmitAsync(int assignmentId, int studentId, string content)
    {
        var assignment = await _context.Assignments
            .Include(a => a.TeacherSubjectAssignment)
                .ThenInclude(t => t.ClassCourse)
            .FirstOrDefaultAsync(a => a.Id == assignmentId)
            ?? throw new NotFoundException($"Assignment with id {assignmentId} not found.");

        // Rule 1: Draft assignments are invisible to students
        if (assignment.Status == AssignmentStatus.Draft)
            throw new NotFoundException($"Assignment with id {assignmentId} not found.");

        // Rule 2: Student can only submit to assignments for their own class
        var isEnrolled = await _context.StudentEnrollments
            .AnyAsync(e => e.StudentId == studentId && e.ClassCourseId == assignment.TeacherSubjectAssignment.ClassCourseId);
        if (!isEnrolled)
            throw new ForbiddenException("You can only submit to assignments for your own class.");

        // Rule 3: Deadline enforcement
        if (assignment.Deadline <= DateTime.UtcNow)
            throw new DeadlinePassedException();

        // Rule 4: One submission per student per assignment
        var existing = await _context.Submissions
            .AnyAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId);
        if (existing)
            throw new DuplicateSubmissionException();

        var submission = new Submission
        {
            AssignmentId = assignmentId,
            StudentId = studentId,
            Content = content,
            SubmittedAt = DateTime.UtcNow,
            Status = SubmissionStatus.Submitted
        };

        _context.Submissions.Add(submission);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Submission created by student {StudentId} for assignment {AssignmentId}", studentId, assignmentId);
        return submission;
    }

    public async Task<Submission> UpdateAsync(int submissionId, int studentId, string content)
    {
        var submission = await _context.Submissions
            .Include(s => s.Assignment)
            .FirstOrDefaultAsync(s => s.Id == submissionId)
            ?? throw new NotFoundException($"Submission with id {submissionId} not found.");

        // Rule 4: Student can only update their own submission
        if (submission.StudentId != studentId)
            throw new ForbiddenException("You can only update your own submission.");

        // Rule 4: Only before deadline
        if (submission.Assignment.Deadline <= DateTime.UtcNow)
            throw new DeadlinePassedException("Cannot update submission after the deadline.");

        submission.Content = content;
        submission.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return submission;
    }

    public async Task<Submission> GradeAsync(int submissionId, int teacherId, decimal marks, string? feedback, bool isAdmin)
    {
        var submission = await _context.Submissions
            .Include(s => s.Assignment)
                .ThenInclude(a => a.TeacherSubjectAssignment)
            .FirstOrDefaultAsync(s => s.Id == submissionId)
            ?? throw new NotFoundException($"Submission with id {submissionId} not found.");

        // Rule 6: Teacher can only grade submissions for assignments they own
        if (!isAdmin && submission.Assignment.TeacherSubjectAssignment.TeacherId != teacherId)
            throw new ForbiddenException("You can only grade submissions for your own assignments.");

        // Rule 5: Marks bounds
        if (marks < 0)
            throw new InvalidMarksException("Marks cannot be negative.");
        if (marks > submission.Assignment.MaxMarks)
            throw new InvalidMarksException($"Marks cannot exceed the maximum marks ({submission.Assignment.MaxMarks}).");

        submission.Marks = marks;
        submission.Feedback = feedback;
        submission.Status = SubmissionStatus.Graded;
        submission.GradedAt = DateTime.UtcNow;
        submission.GradedByUserId = teacherId;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Submission {SubmissionId} graded by teacher {TeacherId} with marks {Marks}", submissionId, teacherId, marks);
        return submission;
    }

    public async Task<Submission> UpdateStatusAsync(int submissionId, int teacherId, SubmissionStatus status, bool isAdmin)
    {
        var submission = await _context.Submissions
            .Include(s => s.Assignment)
                .ThenInclude(a => a.TeacherSubjectAssignment)
            .FirstOrDefaultAsync(s => s.Id == submissionId)
            ?? throw new NotFoundException($"Submission with id {submissionId} not found.");

        if (!isAdmin && submission.Assignment.TeacherSubjectAssignment.TeacherId != teacherId)
            throw new ForbiddenException("You can only update status for submissions of your own assignments.");

        submission.Status = status;
        submission.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Submission {SubmissionId} status changed to {Status} by teacher {TeacherId}", submissionId, status, teacherId);
        return submission;
    }
}
