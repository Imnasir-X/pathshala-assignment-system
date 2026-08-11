using System.ComponentModel.DataAnnotations;

namespace AssignmentSystem.Api.Models;

public enum UserRole
{
    Admin = 0,
    Teacher = 1,
    Student = 2
}

public enum AssignmentStatus
{
    Draft = 0,
    Published = 1
}

public enum SubmissionStatus
{
    Submitted = 0,
    Late = 1,
    Graded = 2,
    ReturnedForRevision = 3
}

public class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<TeacherSubjectAssignment> TeacherAssignments { get; set; } = new List<TeacherSubjectAssignment>();
    public ICollection<StudentClassEnrollment> StudentEnrollments { get; set; } = new List<StudentClassEnrollment>();
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}

public class ClassCourse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Section { get; set; }
    public string? AcademicYear { get; set; }

    // Navigation properties
    public ICollection<Subject> Subjects { get; set; } = new List<Subject>();
    public ICollection<TeacherSubjectAssignment> TeacherAssignments { get; set; } = new List<TeacherSubjectAssignment>();
    public ICollection<StudentClassEnrollment> StudentEnrollments { get; set; } = new List<StudentClassEnrollment>();
}

public class Subject
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public int ClassCourseId { get; set; }
    public ClassCourse ClassCourse { get; set; } = null!;

    // Navigation properties
    public ICollection<TeacherSubjectAssignment> TeacherAssignments { get; set; } = new List<TeacherSubjectAssignment>();
}

public class TeacherSubjectAssignment
{
    public int Id { get; set; }
    public int TeacherId { get; set; }
    public User Teacher { get; set; } = null!;
    public int SubjectId { get; set; }
    public Subject Subject { get; set; } = null!;
    public int ClassCourseId { get; set; }
    public ClassCourse ClassCourse { get; set; } = null!;

    // Navigation properties
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}

public class StudentClassEnrollment
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public User Student { get; set; } = null!;
    public int ClassCourseId { get; set; }
    public ClassCourse ClassCourse { get; set; } = null!;
}

public class Assignment
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TeacherSubjectAssignmentId { get; set; }
    public TeacherSubjectAssignment TeacherSubjectAssignment { get; set; } = null!;
    public DateTime Deadline { get; set; }
    public int MaxMarks { get; set; }
    public AssignmentStatus Status { get; set; } = AssignmentStatus.Draft;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}

public class Submission
{
    public int Id { get; set; }
    public int AssignmentId { get; set; }
    public Assignment Assignment { get; set; } = null!;
    public int StudentId { get; set; }
    public User Student { get; set; } = null!;
    public string Content { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public SubmissionStatus Status { get; set; } = SubmissionStatus.Submitted;
    public decimal? Marks { get; set; }
    public string? Feedback { get; set; }
    public DateTime? GradedAt { get; set; }
    public int? GradedByUserId { get; set; }
}
