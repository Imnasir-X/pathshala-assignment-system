using Microsoft.EntityFrameworkCore;
using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Models;
using AssignmentSystem.Api.Services;
using AssignmentSystem.Api.Exceptions;

namespace AssignmentSystem.Tests.Services;

public class SubmissionServiceTests
{
    private async Task<AppDbContext> GetInMemoryContextAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var ctx = new AppDbContext(options);
        await SeedTestDataAsync(ctx);
        return ctx;
    }

    private async Task SeedTestDataAsync(AppDbContext ctx)
    {
        var admin = new User { Id = 1, FullName = "Admin", Email = "admin@test.edu", PasswordHash = "hash", Role = UserRole.Admin };
        var teacher = new User { Id = 2, FullName = "Teacher John", Email = "teacher@test.edu", PasswordHash = "hash", Role = UserRole.Teacher };
        var teacher2 = new User { Id = 3, FullName = "Teacher Jane", Email = "teacher2@test.edu", PasswordHash = "hash", Role = UserRole.Teacher };
        var student = new User { Id = 4, FullName = "Student Alice", Email = "student@test.edu", PasswordHash = "hash", Role = UserRole.Student };
        var student2 = new User { Id = 5, FullName = "Student Bob", Email = "student2@test.edu", PasswordHash = "hash", Role = UserRole.Student };

        ctx.Users.AddRange(admin, teacher, teacher2, student, student2);

        var class1 = new ClassCourse { Id = 1, Name = "Class A" };
        var class2 = new ClassCourse { Id = 2, Name = "Class B" };
        ctx.ClassCourses.AddRange(class1, class2);
        await ctx.SaveChangesAsync();

        var subj1 = new Subject { Id = 1, Name = "Programming", Code = "CS101", ClassCourseId = 1 };
        ctx.Subjects.Add(subj1);
        await ctx.SaveChangesAsync();

        var tsa1 = new TeacherSubjectAssignment { Id = 1, TeacherId = 2, SubjectId = 1, ClassCourseId = 1 };
        var tsa2 = new TeacherSubjectAssignment { Id = 2, TeacherId = 3, SubjectId = 1, ClassCourseId = 2 };
        ctx.TeacherSubjectAssignments.AddRange(tsa1, tsa2);

        var enr1 = new StudentClassEnrollment { Id = 1, StudentId = 4, ClassCourseId = 1 };
        var enr2 = new StudentClassEnrollment { Id = 2, StudentId = 5, ClassCourseId = 2 };
        ctx.StudentEnrollments.AddRange(enr1, enr2);
        await ctx.SaveChangesAsync();

        // Published assignment, deadline in future, for class 1
        ctx.Assignments.Add(new Assignment
        {
            Id = 1, Title = "Assignment 1", Description = "Test", TeacherSubjectAssignmentId = 1,
            Deadline = DateTime.UtcNow.AddDays(7), MaxMarks = 100, Status = AssignmentStatus.Published, CreatedAt = DateTime.UtcNow
        });

        // Published assignment, deadline in past, for class 1
        ctx.Assignments.Add(new Assignment
        {
            Id = 2, Title = "Assignment 2", Description = "Past deadline", TeacherSubjectAssignmentId = 1,
            Deadline = DateTime.UtcNow.AddDays(-1), MaxMarks = 50, Status = AssignmentStatus.Published, CreatedAt = DateTime.UtcNow.AddDays(-10)
        });

        // Draft assignment, for class 1
        ctx.Assignments.Add(new Assignment
        {
            Id = 3, Title = "Draft Assignment", Description = "Draft", TeacherSubjectAssignmentId = 1,
            Deadline = DateTime.UtcNow.AddDays(14), MaxMarks = 100, Status = AssignmentStatus.Draft, CreatedAt = DateTime.UtcNow
        });

        // Published assignment for class 2 (different teacher)
        ctx.Assignments.Add(new Assignment
        {
            Id = 4, Title = "Other Class Assignment", Description = "Other class", TeacherSubjectAssignmentId = 2,
            Deadline = DateTime.UtcNow.AddDays(7), MaxMarks = 100, Status = AssignmentStatus.Published, CreatedAt = DateTime.UtcNow
        });

        // Graded submission
        ctx.Submissions.Add(new Submission
        {
            Id = 1, AssignmentId = 1, StudentId = 4, Content = "My submission",
            SubmittedAt = DateTime.UtcNow.AddDays(-1), Status = SubmissionStatus.Graded,
            Marks = 85m, Feedback = "Good", GradedAt = DateTime.UtcNow, GradedByUserId = 2
        });

        await ctx.SaveChangesAsync();
    }

    [Fact]
    public async Task Submit_ValidSubmission_CreatesSubmission()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        // Delete existing submission for assignment 1 first
        ctx.Submissions.RemoveRange(ctx.Submissions);
        await ctx.SaveChangesAsync();

        var submission = await svc.SubmitAsync(assignmentId: 1, studentId: 4, content: "New answer");

        Assert.Equal(1, submission.AssignmentId);
        Assert.Equal(4, submission.StudentId);
        Assert.Equal(SubmissionStatus.Submitted, submission.Status);
    }

    [Fact]
    public async Task Submit_AfterDeadline_ThrowsDeadlinePassedException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        // Remove existing submission for assignment 2
        ctx.Submissions.RemoveRange(ctx.Submissions);
        await ctx.SaveChangesAsync();

        var act = () => svc.SubmitAsync(assignmentId: 2, studentId: 4, content: "Late answer");

        await Assert.ThrowsAsync<DeadlinePassedException>(act);
    }

    [Fact]
    public async Task Submit_ToDraftAssignment_ThrowsNotFoundException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        var act = () => svc.SubmitAsync(assignmentId: 3, studentId: 4, content: "Answer");

        await Assert.ThrowsAsync<NotFoundException>(act);
    }

    [Fact]
    public async Task Submit_ToDifferentClass_ThrowsForbiddenException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        // Student 4 is enrolled in class 1, but assignment 4 is for class 2
        var act = () => svc.SubmitAsync(assignmentId: 4, studentId: 4, content: "Answer");

        await Assert.ThrowsAsync<ForbiddenException>(act);
    }

    [Fact]
    public async Task Submit_DuplicateSubmission_ThrowsDuplicateSubmissionException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        // Submission already exists for assignment 1, student 4
        var act = () => svc.SubmitAsync(assignmentId: 1, studentId: 4, content: "Another attempt");

        await Assert.ThrowsAsync<DuplicateSubmissionException>(act);
    }

    [Fact]
    public async Task Update_OwnSubmission_BeforeDeadline_Succeeds()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        var updated = await svc.UpdateAsync(submissionId: 1, studentId: 4, content: "Updated content");

        Assert.Equal("Updated content", updated.Content);
        Assert.NotNull(updated.UpdatedAt);
    }

    [Fact]
    public async Task Update_OtherStudentSubmission_ThrowsForbiddenException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        var act = () => svc.UpdateAsync(submissionId: 1, studentId: 5, content: "Hacked");

        await Assert.ThrowsAsync<ForbiddenException>(act);
    }

    [Fact]
    public async Task Update_AfterDeadline_ThrowsDeadlinePassedException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        // Add a submission to the past-deadline assignment
        ctx.Submissions.Add(new Submission
        {
            Id = 10, AssignmentId = 2, StudentId = 4, Content = "On time",
            SubmittedAt = DateTime.UtcNow.AddDays(-5), Status = SubmissionStatus.Submitted
        });
        await ctx.SaveChangesAsync();

        var act = () => svc.UpdateAsync(submissionId: 10, studentId: 4, content: "Too late update");

        await Assert.ThrowsAsync<DeadlinePassedException>(act);
    }

    [Fact]
    public async Task Grade_MarksAboveMax_ThrowsInvalidMarksException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        var act = () => svc.GradeAsync(submissionId: 1, teacherId: 2, marks: 150, feedback: "", isAdmin: false);

        await Assert.ThrowsAsync<InvalidMarksException>(act);
    }

    [Fact]
    public async Task Grade_NegativeMarks_ThrowsInvalidMarksException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        var act = () => svc.GradeAsync(submissionId: 1, teacherId: 2, marks: -5, feedback: "", isAdmin: false);

        await Assert.ThrowsAsync<InvalidMarksException>(act);
    }

    [Fact]
    public async Task Grade_ByWrongTeacher_ThrowsForbiddenException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        // Teacher 3 doesn't own assignment 1 (owned by teacher 2)
        var act = () => svc.GradeAsync(submissionId: 1, teacherId: 3, marks: 80, feedback: "Good", isAdmin: false);

        await Assert.ThrowsAsync<ForbiddenException>(act);
    }

    [Fact]
    public async Task Grade_ByOwningTeacher_Succeeds()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        var graded = await svc.GradeAsync(submissionId: 1, teacherId: 2, marks: 90, feedback: "Excellent", isAdmin: false);

        Assert.Equal(90m, graded.Marks);
        Assert.Equal(SubmissionStatus.Graded, graded.Status);
        Assert.NotNull(graded.GradedAt);
    }

    [Fact]
    public async Task Grade_WithMaxMarks_Succeeds()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        var graded = await svc.GradeAsync(submissionId: 1, teacherId: 2, marks: 100, feedback: "Perfect", isAdmin: false);

        Assert.Equal(100m, graded.Marks);
    }

    [Fact]
    public async Task Grade_WithZeroMarks_Succeeds()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        var graded = await svc.GradeAsync(submissionId: 1, teacherId: 2, marks: 0, feedback: "Needs work", isAdmin: false);

        Assert.Equal(0m, graded.Marks);
    }

    [Fact]
    public async Task GetSubmissions_ByWrongTeacher_ThrowsForbiddenException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        var act = () => svc.GetSubmissionsForAssignmentAsync(assignmentId: 1, currentUserId: 3, isAdmin: false, page: 1, pageSize: 20);

        await Assert.ThrowsAsync<ForbiddenException>(act);
    }

    [Fact]
    public async Task UpdateStatus_ByOwningTeacher_Succeeds()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        // Submission 1 is for assignment 1, which is owned by teacher 2
        var updated = await svc.UpdateStatusAsync(submissionId: 1, teacherId: 2, status: SubmissionStatus.ReturnedForRevision, isAdmin: false);

        Assert.Equal(SubmissionStatus.ReturnedForRevision, updated.Status);
        Assert.NotNull(updated.UpdatedAt);
    }

    [Fact]
    public async Task UpdateStatus_ByWrongTeacher_ThrowsForbiddenException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        // Teacher 3 does not own assignment 1 (owned by teacher 2)
        var act = () => svc.UpdateStatusAsync(submissionId: 1, teacherId: 3, status: SubmissionStatus.ReturnedForRevision, isAdmin: false);

        await Assert.ThrowsAsync<ForbiddenException>(act);
    }

    [Fact]
    public async Task UpdateStatus_ByAdmin_Succeeds()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<SubmissionService>();
        var svc = new SubmissionService(ctx, logger);

        // Admin can update any submission
        var updated = await svc.UpdateStatusAsync(submissionId: 1, teacherId: 1, status: SubmissionStatus.ReturnedForRevision, isAdmin: true);

        Assert.Equal(SubmissionStatus.ReturnedForRevision, updated.Status);
        Assert.NotNull(updated.UpdatedAt);
    }
}
