using Microsoft.EntityFrameworkCore;
using AssignmentSystem.Api.Models;

namespace AssignmentSystem.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<ClassCourse> ClassCourses { get; set; } = null!;
    public DbSet<Subject> Subjects { get; set; } = null!;
    public DbSet<TeacherSubjectAssignment> TeacherSubjectAssignments { get; set; } = null!;
    public DbSet<StudentClassEnrollment> StudentEnrollments { get; set; } = null!;
    public DbSet<Assignment> Assignments { get; set; } = null!;
    public DbSet<Submission> Submissions { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).IsRequired().HasMaxLength(256);
            e.Property(u => u.FullName).IsRequired().HasMaxLength(200);
            e.Property(u => u.PasswordHash).IsRequired();
        });

        // ClassCourse
        modelBuilder.Entity<ClassCourse>(e =>
        {
            e.Property(c => c.Name).IsRequired().HasMaxLength(200);
        });

        // Subject
        modelBuilder.Entity<Subject>(e =>
        {
            e.Property(s => s.Name).IsRequired().HasMaxLength(200);
            e.HasOne(s => s.ClassCourse)
                .WithMany(c => c.Subjects)
                .HasForeignKey(s => s.ClassCourseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // TeacherSubjectAssignment
        modelBuilder.Entity<TeacherSubjectAssignment>(e =>
        {
            e.HasIndex(t => new { t.TeacherId, t.SubjectId, t.ClassCourseId }).IsUnique();
            e.HasOne(t => t.Teacher)
                .WithMany(u => u.TeacherAssignments)
                .HasForeignKey(t => t.TeacherId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(t => t.Subject)
                .WithMany(s => s.TeacherAssignments)
                .HasForeignKey(t => t.SubjectId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(t => t.ClassCourse)
                .WithMany(c => c.TeacherAssignments)
                .HasForeignKey(t => t.ClassCourseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // StudentClassEnrollment
        modelBuilder.Entity<StudentClassEnrollment>(e =>
        {
            e.HasIndex(s => new { s.StudentId, s.ClassCourseId }).IsUnique();
            e.HasOne(s => s.Student)
                .WithMany(u => u.StudentEnrollments)
                .HasForeignKey(s => s.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(s => s.ClassCourse)
                .WithMany(c => c.StudentEnrollments)
                .HasForeignKey(s => s.ClassCourseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Assignment
        modelBuilder.Entity<Assignment>(e =>
        {
            e.Property(a => a.Title).IsRequired().HasMaxLength(300);
            e.Property(a => a.MaxMarks).IsRequired();
            e.HasOne(a => a.TeacherSubjectAssignment)
                .WithMany(t => t.Assignments)
                .HasForeignKey(a => a.TeacherSubjectAssignmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Submission
        modelBuilder.Entity<Submission>(e =>
        {
            e.HasIndex(s => new { s.AssignmentId, s.StudentId }).IsUnique();
            e.Property(s => s.Content).IsRequired();
            e.HasOne(s => s.Assignment)
                .WithMany(a => a.Submissions)
                .HasForeignKey(s => s.AssignmentId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(s => s.Student)
                .WithMany(u => u.Submissions)
                .HasForeignKey(s => s.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
            e.Property(s => s.Marks).HasPrecision(6, 2);
        });
    }
}
