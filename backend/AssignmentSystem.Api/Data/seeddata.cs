using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Serilog;
using AssignmentSystem.Api.Models;

namespace AssignmentSystem.Api.Data;

public static class SeedData
{
    public static async Task SeedAsync(AppDbContext context)
    {
        // Auto-fix: update old @assignment.edu emails to @edu.bd if they exist
        var oldUsers = await context.Users.Where(u => u.Email.EndsWith("@assignment.edu")).ToListAsync();
        foreach (var u in oldUsers)
        {
            u.Email = u.Email switch
            {
                "admin@assignment.edu" => "admin@edu.bd",
                "teacher@assignment.edu" => "abdur.rahman@edu.bd",
                "student@assignment.edu" => "sadia.islam@edu.bd",
                _ => u.Email.Replace("@assignment.edu", "@edu.bd")
            };
        }
        if (oldUsers.Count > 0)
        {
            await context.SaveChangesAsync();
            Log.Information("Updated {Count} user emails from @assignment.edu to @edu.bd", oldUsers.Count);
        }

        if (await context.Users.AnyAsync()) return;

        // Users — Bangladeshi names
        var admin = new User { FullName = "Rakib Hasan", Email = "admin@edu.bd", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Passw0rd!"), Role = UserRole.Admin, CreatedAt = DateTime.UtcNow };
        var teacher = new User { FullName = "Md. Abdur Rahman", Email = "abdur.rahman@edu.bd", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Passw0rd!"), Role = UserRole.Teacher, CreatedAt = DateTime.UtcNow };
        var teacher2 = new User { FullName = "Fatima Begum", Email = "fatima.begum@edu.bd", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Passw0rd!"), Role = UserRole.Teacher, CreatedAt = DateTime.UtcNow };
        var student = new User { FullName = "Sadia Islam", Email = "sadia.islam@edu.bd", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Passw0rd!"), Role = UserRole.Student, CreatedAt = DateTime.UtcNow };
        var student2 = new User { FullName = "Tanvir Ahmed", Email = "tanvir.ahmed@edu.bd", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Passw0rd!"), Role = UserRole.Student, CreatedAt = DateTime.UtcNow };

        context.Users.AddRange(admin, teacher, teacher2, student, student2);

        // Classes — Bangladeshi curriculum (SSC/HSC style)
        var class1 = new ClassCourse { Name = "Class 9 - Science", Section = "A", AcademicYear = "2025-2026" };
        var class2 = new ClassCourse { Name = "Class 10 - Science", Section = "B", AcademicYear = "2025-2026" };
        context.ClassCourses.AddRange(class1, class2);

        await context.SaveChangesAsync();

        // Subjects — Bengali curriculum
        var subj1 = new Subject { Name = "Bangla (1st Paper)", Code = "BAN101", ClassCourseId = class1.Id };
        var subj2 = new Subject { Name = "General Mathematics", Code = "MATH101", ClassCourseId = class1.Id };
        var subj3 = new Subject { Name = "Physics", Code = "PHY201", ClassCourseId = class2.Id };
        context.Subjects.AddRange(subj1, subj2, subj3);

        await context.SaveChangesAsync();

        // TeacherSubjectAssignments
        var tsa1 = new TeacherSubjectAssignment { TeacherId = teacher.Id, SubjectId = subj1.Id, ClassCourseId = class1.Id };
        var tsa2 = new TeacherSubjectAssignment { TeacherId = teacher.Id, SubjectId = subj2.Id, ClassCourseId = class1.Id };
        var tsa3 = new TeacherSubjectAssignment { TeacherId = teacher2.Id, SubjectId = subj3.Id, ClassCourseId = class2.Id };
        context.TeacherSubjectAssignments.AddRange(tsa1, tsa2, tsa3);

        // Student enrollments
        var enr1 = new StudentClassEnrollment { StudentId = student.Id, ClassCourseId = class1.Id };
        var enr2 = new StudentClassEnrollment { StudentId = student2.Id, ClassCourseId = class2.Id };
        context.StudentEnrollments.AddRange(enr1, enr2);

        await context.SaveChangesAsync();

        // Assignments — Bengali curriculum content
        var a1 = new Assignment
        {
            Title = "Bangla Sahitya: Rabindranath Tagore-er Galpo",
            Description = "Rabindranath Tagore-er 'Kabuliwala' golpota padho ebang mukhosto koro. Tarpor galper mukto somorthone bibhranti ti bishleshon koro.",
            TeacherSubjectAssignmentId = tsa1.Id,
            Deadline = DateTime.UtcNow.AddDays(7),
            MaxMarks = 100,
            Status = AssignmentStatus.Published,
            CreatedAt = DateTime.UtcNow
        };
        var a2 = new Assignment
        {
            Title = "Dosomik Shonkha o Bijnan: Aljerberik Rasitikoron",
            Description = "Dosomik shonkha system-e rasitikoron (rationalization) niyomshomuhho shikhbo. 5ti sonkha ke rasitikoron kore bibhranto maan ber koro.",
            TeacherSubjectAssignmentId = tsa2.Id,
            Deadline = DateTime.UtcNow.AddDays(-2),
            MaxMarks = 50,
            Status = AssignmentStatus.Published,
            CreatedAt = DateTime.UtcNow.AddDays(-10)
        };
        var a3 = new Assignment
        {
            Title = "Draft Assignment - Newton-er Gotor Sutro",
            Description = "Newton-er gotor sutro (Laws of Motion) prothom, ditio o tritiyo sutro niye dhalon likho. Eta ekhono draft haiyache.",
            TeacherSubjectAssignmentId = tsa1.Id,
            Deadline = DateTime.UtcNow.AddDays(14),
            MaxMarks = 100,
            Status = AssignmentStatus.Draft,
            CreatedAt = DateTime.UtcNow
        };
        context.Assignments.AddRange(a1, a2, a3);

        await context.SaveChangesAsync();

        // Submissions — Bengali content
        var s1 = new Submission
        {
            AssignmentId = a2.Id,
            StudentId = student.Id,
            Content = "Dosomik shonkha system-e rasitikoron: √2 = 1.4142, √3 = 1.7321, √5 = 2.2361, √7 = 2.6458, √10 = 3.1623. Bibhranto maan esob-i.",
            SubmittedAt = DateTime.UtcNow.AddDays(-5),
            Status = SubmissionStatus.Graded,
            Marks = 42m,
            Feedback = "Valo korechho, kintu √7 o √10-er maan ektu bhul hoyeche. Abr protikkorito koro.",
            GradedAt = DateTime.UtcNow.AddDays(-1),
            GradedByUserId = teacher.Id
        };
        context.Submissions.Add(s1);

        await context.SaveChangesAsync();
    }
}
