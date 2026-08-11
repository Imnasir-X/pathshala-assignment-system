using Microsoft.EntityFrameworkCore;
using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Models;
using AssignmentSystem.Api.Exceptions;

namespace AssignmentSystem.Api.Services;

public interface IClassCourseService
{
    Task<List<ClassCourse>> GetAllAsync(int page = 1, int pageSize = 20);
    Task<ClassCourse?> GetByIdAsync(int id);
    Task<ClassCourse> CreateAsync(string name, string? section, string? academicYear);
    Task<ClassCourse> UpdateAsync(int id, string name, string? section, string? academicYear);
    Task<bool> DeleteAsync(int id);
}

public class ClassCourseService : IClassCourseService
{
    private readonly AppDbContext _context;

    public ClassCourseService(AppDbContext context) { _context = context; }

    public async Task<List<ClassCourse>> GetAllAsync(int page = 1, int pageSize = 20) =>
        await _context.ClassCourses.OrderBy(c => c.Id).Skip((page - 1) * pageSize).Take(pageSize).AsNoTracking().ToListAsync();

    public async Task<ClassCourse?> GetByIdAsync(int id) => await _context.ClassCourses.FindAsync(id);

    public async Task<ClassCourse> CreateAsync(string name, string? section, string? academicYear)
    {
        var cc = new ClassCourse { Name = name, Section = section, AcademicYear = academicYear };
        _context.ClassCourses.Add(cc);
        await _context.SaveChangesAsync();
        return cc;
    }

    public async Task<ClassCourse> UpdateAsync(int id, string name, string? section, string? academicYear)
    {
        var cc = await _context.ClassCourses.FindAsync(id) ?? throw new NotFoundException($"Class with id {id} not found.");
        cc.Name = name; cc.Section = section; cc.AcademicYear = academicYear;
        await _context.SaveChangesAsync();
        return cc;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var cc = await _context.ClassCourses.FindAsync(id) ?? throw new NotFoundException($"Class with id {id} not found.");
        _context.ClassCourses.Remove(cc);
        await _context.SaveChangesAsync();
        return true;
    }
}

public interface ISubjectService
{
    Task<List<Subject>> GetAllAsync(int? classCourseId, int page = 1, int pageSize = 20);
    Task<Subject?> GetByIdAsync(int id);
    Task<Subject> CreateAsync(string name, string? code, int classCourseId);
    Task<Subject> UpdateAsync(int id, string name, string? code);
    Task<bool> DeleteAsync(int id);
}

public class SubjectService : ISubjectService
{
    private readonly AppDbContext _context;

    public SubjectService(AppDbContext context) { _context = context; }

    public async Task<List<Subject>> GetAllAsync(int? classCourseId, int page = 1, int pageSize = 20)
    {
        var q = _context.Subjects.Include(s => s.ClassCourse).AsNoTracking().AsQueryable();
        if (classCourseId.HasValue) q = q.Where(s => s.ClassCourseId == classCourseId.Value);
        return await q.OrderBy(s => s.Id).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
    }

    public async Task<Subject?> GetByIdAsync(int id) => await _context.Subjects.Include(s => s.ClassCourse).FirstOrDefaultAsync(s => s.Id == id);

    public async Task<Subject> CreateAsync(string name, string? code, int classCourseId)
    {
        if (!await _context.ClassCourses.AnyAsync(c => c.Id == classCourseId))
            throw new NotFoundException($"Class with id {classCourseId} not found.");
        var subj = new Subject { Name = name, Code = code, ClassCourseId = classCourseId };
        _context.Subjects.Add(subj);
        await _context.SaveChangesAsync();
        return subj;
    }

    public async Task<Subject> UpdateAsync(int id, string name, string? code)
    {
        var subj = await _context.Subjects.FindAsync(id) ?? throw new NotFoundException($"Subject with id {id} not found.");
        subj.Name = name; subj.Code = code;
        await _context.SaveChangesAsync();
        return subj;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var subj = await _context.Subjects.FindAsync(id) ?? throw new NotFoundException($"Subject with id {id} not found.");
        _context.Subjects.Remove(subj);
        await _context.SaveChangesAsync();
        return true;
    }
}

public interface ITeacherSubjectAssignmentService
{
    Task<List<TeacherSubjectAssignment>> GetAllAsync(int page = 1, int pageSize = 20);
    Task<List<TeacherSubjectAssignment>> GetByTeacherIdAsync(int teacherId, int page = 1, int pageSize = 20);
    Task<TeacherSubjectAssignment?> GetByIdAsync(int id);
    Task<TeacherSubjectAssignment> CreateAsync(int teacherId, int subjectId, int classCourseId);
    Task<bool> DeleteAsync(int id);
}

public class TeacherSubjectAssignmentService : ITeacherSubjectAssignmentService
{
    private readonly AppDbContext _context;

    public TeacherSubjectAssignmentService(AppDbContext context) { _context = context; }

    public async Task<List<TeacherSubjectAssignment>> GetAllAsync(int page = 1, int pageSize = 20) =>
        await _context.TeacherSubjectAssignments
            .Include(t => t.Teacher).Include(t => t.Subject).Include(t => t.ClassCourse)
            .OrderBy(t => t.Id).Skip((page - 1) * pageSize).Take(pageSize).AsNoTracking().ToListAsync();

    public async Task<List<TeacherSubjectAssignment>> GetByTeacherIdAsync(int teacherId, int page = 1, int pageSize = 20) =>
        await _context.TeacherSubjectAssignments
            .Include(t => t.Teacher).Include(t => t.Subject).Include(t => t.ClassCourse)
            .Where(t => t.TeacherId == teacherId)
            .OrderBy(t => t.Id).Skip((page - 1) * pageSize).Take(pageSize).AsNoTracking().ToListAsync();

    public async Task<TeacherSubjectAssignment?> GetByIdAsync(int id) =>
        await _context.TeacherSubjectAssignments
            .Include(t => t.Teacher).Include(t => t.Subject).Include(t => t.ClassCourse)
            .FirstOrDefaultAsync(t => t.Id == id);

    public async Task<TeacherSubjectAssignment> CreateAsync(int teacherId, int subjectId, int classCourseId)
    {
        if (!await _context.Users.AnyAsync(u => u.Id == teacherId && u.Role == UserRole.Teacher))
            throw new ValidationException("Teacher not found or user is not a teacher.");
        if (!await _context.Subjects.AnyAsync(s => s.Id == subjectId))
            throw new NotFoundException($"Subject with id {subjectId} not found.");
        if (!await _context.ClassCourses.AnyAsync(c => c.Id == classCourseId))
            throw new NotFoundException($"Class with id {classCourseId} not found.");
        if (await _context.TeacherSubjectAssignments.AnyAsync(t => t.TeacherId == teacherId && t.SubjectId == subjectId && t.ClassCourseId == classCourseId))
            throw new BusinessRuleException("This teacher is already assigned to this subject+class.");

        var tsa = new TeacherSubjectAssignment { TeacherId = teacherId, SubjectId = subjectId, ClassCourseId = classCourseId };
        _context.TeacherSubjectAssignments.Add(tsa);
        await _context.SaveChangesAsync();
        return tsa;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var tsa = await _context.TeacherSubjectAssignments.FindAsync(id) ?? throw new NotFoundException($"Teacher-subject assignment with id {id} not found.");
        _context.TeacherSubjectAssignments.Remove(tsa);
        await _context.SaveChangesAsync();
        return true;
    }
}
