using Microsoft.EntityFrameworkCore;
using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Models;
using AssignmentSystem.Api.Services;
using AssignmentSystem.Api.Exceptions;

namespace AssignmentSystem.Tests.Services;

public class AssignmentServiceTests
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
        var teacher = new User { Id = 2, FullName = "Teacher John", Email = "teacher@test.edu", PasswordHash = "hash", Role = UserRole.Teacher };
        var teacher2 = new User { Id = 3, FullName = "Teacher Jane", Email = "teacher2@test.edu", PasswordHash = "hash", Role = UserRole.Teacher };
        var student = new User { Id = 4, FullName = "Student Alice", Email = "student@test.edu", PasswordHash = "hash", Role = UserRole.Student };

        ctx.Users.AddRange(teacher, teacher2, student);

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
        ctx.StudentEnrollments.Add(enr1);
        await ctx.SaveChangesAsync();

        ctx.Assignments.AddRange(
            new Assignment
            {
                Id = 1, Title = "Published Assignment", Description = "Test",
                TeacherSubjectAssignmentId = 1, Deadline = DateTime.UtcNow.AddDays(7),
                MaxMarks = 100, Status = AssignmentStatus.Published, CreatedAt = DateTime.UtcNow
            },
            new Assignment
            {
                Id = 2, Title = "Draft Assignment", Description = "Draft",
                TeacherSubjectAssignmentId = 1, Deadline = DateTime.UtcNow.AddDays(14),
                MaxMarks = 100, Status = AssignmentStatus.Draft, CreatedAt = DateTime.UtcNow
            },
            new Assignment
            {
                Id = 3, Title = "Other Teacher Assignment", Description = "Other",
                TeacherSubjectAssignmentId = 2, Deadline = DateTime.UtcNow.AddDays(7),
                MaxMarks = 100, Status = AssignmentStatus.Published, CreatedAt = DateTime.UtcNow
            }
        );
        await ctx.SaveChangesAsync();
    }

    [Fact]
    public async Task GetAssignments_Student_ExcludesDraftAssignments()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<AssignmentService>();
        var svc = new AssignmentService(ctx, logger);

        var assignments = await svc.GetAssignmentsAsync(teacherId: null, studentId: 4, adminView: false);

        Assert.All(assignments, a => Assert.Equal(AssignmentStatus.Published, a.Status));
        Assert.DoesNotContain(assignments, a => a.Id == 2); // Draft assignment
    }

    [Fact]
    public async Task GetAssignments_Student_OnlySeesOwnClass()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<AssignmentService>();
        var svc = new AssignmentService(ctx, logger);

        var assignments = await svc.GetAssignmentsAsync(teacherId: null, studentId: 4, adminView: false);

        // Student 4 is in class 1, so should see assignment 1 but not assignment 3 (class 2)
        Assert.Contains(assignments, a => a.Id == 1);
        Assert.DoesNotContain(assignments, a => a.Id == 3);
    }

    [Fact]
    public async Task GetAssignments_Teacher_OnlySeesOwnAssignments()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<AssignmentService>();
        var svc = new AssignmentService(ctx, logger);

        var assignments = await svc.GetAssignmentsAsync(teacherId: 2, studentId: null, adminView: false);

        Assert.All(assignments, a => Assert.Equal(2, a.TeacherSubjectAssignment.TeacherId));
        Assert.Contains(assignments, a => a.Id == 1);
        Assert.Contains(assignments, a => a.Id == 2); // Teacher sees their own drafts
        Assert.DoesNotContain(assignments, a => a.Id == 3);
    }

    [Fact]
    public async Task GetAssignments_Admin_SeesAll()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<AssignmentService>();
        var svc = new AssignmentService(ctx, logger);

        var assignments = await svc.GetAssignmentsAsync(teacherId: null, studentId: null, adminView: true);

        Assert.Equal(3, assignments.Count);
    }

    [Fact]
    public async Task Create_WithNonOwningTeacher_ThrowsForbiddenException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<AssignmentService>();
        var svc = new AssignmentService(ctx, logger);

        var input = new CreateAssignmentInput(
            Title: "Test", Description: "Test",
            TeacherSubjectAssignmentId: 2, // owned by teacher 3
            Deadline: DateTime.UtcNow.AddDays(7), MaxMarks: 100,
            Status: AssignmentStatus.Published, CurrentUserId: 2
        );

        var act = () => svc.CreateAsync(input);
        await Assert.ThrowsAsync<ForbiddenException>(act);
    }

    [Fact]
    public async Task Create_WithPastDeadline_ThrowsValidationException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<AssignmentService>();
        var svc = new AssignmentService(ctx, logger);

        var input = new CreateAssignmentInput(
            Title: "Test", Description: "Test",
            TeacherSubjectAssignmentId: 1,
            Deadline: DateTime.UtcNow.AddDays(-1),
            MaxMarks: 100, Status: AssignmentStatus.Published, CurrentUserId: 2
        );

        var act = () => svc.CreateAsync(input);
        await Assert.ThrowsAsync<ValidationException>(act);
    }

    [Fact]
    public async Task Create_WithZeroMaxMarks_ThrowsValidationException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<AssignmentService>();
        var svc = new AssignmentService(ctx, logger);

        var input = new CreateAssignmentInput(
            Title: "Test", Description: "Test",
            TeacherSubjectAssignmentId: 1,
            Deadline: DateTime.UtcNow.AddDays(7),
            MaxMarks: 0, Status: AssignmentStatus.Published, CurrentUserId: 2
        );

        var act = () => svc.CreateAsync(input);
        await Assert.ThrowsAsync<ValidationException>(act);
    }

    [Fact]
    public async Task Update_ByNonOwner_ThrowsForbiddenException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<AssignmentService>();
        var svc = new AssignmentService(ctx, logger);

        var input = new UpdateAssignmentInput(
            Title: "Hacked", Description: null, Deadline: null, MaxMarks: null, Status: null, CurrentUserId: 3
        );

        var act = () => svc.UpdateAsync(1, input, 3);
        await Assert.ThrowsAsync<ForbiddenException>(act);
    }

    [Fact]
    public async Task Delete_ByNonOwner_ThrowsForbiddenException()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<AssignmentService>();
        var svc = new AssignmentService(ctx, logger);

        var act = () => svc.DeleteAsync(1, 3);
        await Assert.ThrowsAsync<ForbiddenException>(act);
    }

    [Fact]
    public async Task Create_ByOwningTeacher_Succeeds()
    {
        var ctx = await GetInMemoryContextAsync();
        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<AssignmentService>();
        var svc = new AssignmentService(ctx, logger);

        var input = new CreateAssignmentInput(
            Title: "New Assignment", Description: "New",
            TeacherSubjectAssignmentId: 1,
            Deadline: DateTime.UtcNow.AddDays(10),
            MaxMarks: 50, Status: AssignmentStatus.Draft, CurrentUserId: 2
        );

        var assignment = await svc.CreateAsync(input);

        Assert.Equal("New Assignment", assignment.Title);
        Assert.Equal(AssignmentStatus.Draft, assignment.Status);
    }
}
