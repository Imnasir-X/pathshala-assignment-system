namespace AssignmentSystem.Api.DTOs;

public record LoginRequestDto(string Email, string Password);
public record LoginResponseDto(string Token, string Email, string Role, string FullName);
public record UserDto(int Id, string FullName, string Email, string Role, DateTime CreatedAt);
public record CreateUserDto(string FullName, string Email, string Password, string Role);
public record UpdateUserDto(string FullName, string Email, string Role);

public record ClassCourseDto(int Id, string Name, string? Section, string? AcademicYear);
public record CreateClassCourseDto(string Name, string? Section, string? AcademicYear);
public record UpdateClassCourseDto(string Name, string? Section, string? AcademicYear);

public record SubjectDto(int Id, string Name, string? Code, int ClassCourseId);
public record CreateSubjectDto(string Name, string? Code, int ClassCourseId);
public record UpdateSubjectDto(string Name, string? Code);

public record TeacherSubjectAssignmentDto(int Id, int TeacherId, string TeacherName, int SubjectId, string SubjectName, int ClassCourseId, string ClassCourseName);
public record CreateTeacherSubjectAssignmentDto(int TeacherId, int SubjectId, int ClassCourseId);

public record AssignmentDto(int Id, string Title, string? Description, int TeacherSubjectAssignmentId, DateTime Deadline, int MaxMarks, string Status, DateTime CreatedAt, DateTime? UpdatedAt, string TeacherName, string SubjectName, string ClassName);
public record CreateAssignmentDto(string Title, string? Description, int TeacherSubjectAssignmentId, DateTime Deadline, int MaxMarks, string Status);
public record UpdateAssignmentDto(string? Title, string? Description, DateTime? Deadline, int? MaxMarks, string? Status);

public record SubmissionDto(int Id, int AssignmentId, int StudentId, string StudentName, string Content, DateTime SubmittedAt, DateTime? UpdatedAt, string Status, decimal? Marks, string? Feedback, DateTime? GradedAt, int? GradedByUserId);
public record CreateSubmissionDto(string Content);
public record UpdateSubmissionDto(string Content);
public record GradeSubmissionDto(decimal Marks, string? Feedback);
public record UpdateSubmissionStatusDto(string Status);
