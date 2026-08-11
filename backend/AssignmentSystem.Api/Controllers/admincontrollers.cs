using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AssignmentSystem.Api.Services;
using AssignmentSystem.Api.DTOs;

namespace AssignmentSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class ClassesController : ControllerBase
{
    private readonly IClassCourseService _service;
    public ClassesController(IClassCourseService service) { _service = service; }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var items = await _service.GetAllAsync(page, pageSize);
        return Ok(items.Select(c => new ClassCourseDto(c.Id, c.Name, c.Section, c.AcademicYear)));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var c = await _service.GetByIdAsync(id);
        if (c == null) return NotFound();
        return Ok(new ClassCourseDto(c.Id, c.Name, c.Section, c.AcademicYear));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClassCourseDto dto)
    {
        var c = await _service.CreateAsync(dto.Name, dto.Section, dto.AcademicYear);
        return CreatedAtAction(nameof(GetById), new { id = c.Id }, new ClassCourseDto(c.Id, c.Name, c.Section, c.AcademicYear));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateClassCourseDto dto)
    {
        var c = await _service.UpdateAsync(id, dto.Name, dto.Section, dto.AcademicYear);
        return Ok(new ClassCourseDto(c.Id, c.Name, c.Section, c.AcademicYear));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class SubjectsController : ControllerBase
{
    private readonly ISubjectService _service;
    public SubjectsController(ISubjectService service) { _service = service; }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? classCourseId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var items = await _service.GetAllAsync(classCourseId, page, pageSize);
        return Ok(items.Select(s => new SubjectDto(s.Id, s.Name, s.Code, s.ClassCourseId)));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var s = await _service.GetByIdAsync(id);
        if (s == null) return NotFound();
        return Ok(new SubjectDto(s.Id, s.Name, s.Code, s.ClassCourseId));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSubjectDto dto)
    {
        var s = await _service.CreateAsync(dto.Name, dto.Code, dto.ClassCourseId);
        return CreatedAtAction(nameof(GetById), new { id = s.Id }, new SubjectDto(s.Id, s.Name, s.Code, s.ClassCourseId));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSubjectDto dto)
    {
        var s = await _service.UpdateAsync(id, dto.Name, dto.Code);
        return Ok(new SubjectDto(s.Id, s.Name, s.Code, s.ClassCourseId));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}

/// <summary>
/// Teacher–subject–class assignments.
/// GET is available to Admin (all) and Teacher (own only).
/// Create/Delete are Admin-only.
/// </summary>
[ApiController]
[Route("api/teacher-assignments")]
[Authorize(Roles = "Admin,Teacher")]
public class TeacherAssignmentsController : ControllerBase
{
    private readonly ITeacherSubjectAssignmentService _service;
    public TeacherAssignmentsController(ITeacherSubjectAssignmentService service) { _service = service; }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub")!.Value);
    private bool IsAdmin => User.IsInRole("Admin");

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        List<Models.TeacherSubjectAssignment> items;
        if (IsAdmin)
        {
            items = await _service.GetAllAsync(page, pageSize);
        }
        else
        {
            // Teachers only see their own class+subject assignments (for create-assignment dropdown)
            items = await _service.GetByTeacherIdAsync(CurrentUserId, page, pageSize);
        }
        return Ok(items.Select(t => new TeacherSubjectAssignmentDto(
            t.Id, t.TeacherId, t.Teacher?.FullName ?? "",
            t.SubjectId, t.Subject?.Name ?? "",
            t.ClassCourseId, t.ClassCourse?.Name ?? "")));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var t = await _service.GetByIdAsync(id);
        if (t == null) return NotFound();
        // Teachers can only view their own assignments
        if (!IsAdmin && t.TeacherId != CurrentUserId)
            throw new AssignmentSystem.Api.Exceptions.ForbiddenException("You can only view your own teacher assignments.");
        return Ok(new TeacherSubjectAssignmentDto(
            t.Id, t.TeacherId, t.Teacher?.FullName ?? "",
            t.SubjectId, t.Subject?.Name ?? "",
            t.ClassCourseId, t.ClassCourse?.Name ?? ""));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateTeacherSubjectAssignmentDto dto)
    {
        var t = await _service.CreateAsync(dto.TeacherId, dto.SubjectId, dto.ClassCourseId);
        // Reload with navigation properties for response DTO
        var created = await _service.GetByIdAsync(t.Id) ?? t;
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, new TeacherSubjectAssignmentDto(
            created.Id, created.TeacherId, created.Teacher?.FullName ?? "",
            created.SubjectId, created.Subject?.Name ?? "",
            created.ClassCourseId, created.ClassCourse?.Name ?? ""));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
