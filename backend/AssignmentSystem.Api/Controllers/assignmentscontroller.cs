using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AssignmentSystem.Api.Services;
using AssignmentSystem.Api.Models;
using AssignmentSystem.Api.DTOs;

namespace AssignmentSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssignmentsController : ControllerBase
{
    private readonly IAssignmentService _assignmentService;
    private readonly ITeacherSubjectAssignmentService _tsaService;

    public AssignmentsController(IAssignmentService assignmentService, ITeacherSubjectAssignmentService tsaService)
    {
        _assignmentService = assignmentService;
        _tsaService = tsaService;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub")!.Value);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role) ?? "";
    private bool IsAdmin => CurrentRole == "Admin";
    private bool IsTeacher => CurrentRole == "Teacher";
    private bool IsStudent => CurrentRole == "Student";

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        int? teacherId = IsTeacher ? CurrentUserId : null;
        int? studentId = IsStudent ? CurrentUserId : null;
        bool adminView = IsAdmin;

        var assignments = await _assignmentService.GetAssignmentsAsync(teacherId, studentId, adminView, page, pageSize);
        return Ok(assignments.Select(MapToDto));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var a = await _assignmentService.GetByIdAsync(id);
        if (a == null) return NotFound();

        // Students can't see draft assignments
        if (IsStudent && a.Status == AssignmentStatus.Draft)
            return NotFound();

        return Ok(MapToDto(a));
    }

    [HttpPost]
    [Authorize(Roles = "Teacher")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Create([FromBody] CreateAssignmentDto dto)
    {
        if (!Enum.TryParse<AssignmentStatus>(dto.Status, true, out var status))
            throw new AssignmentSystem.Api.Exceptions.ValidationException($"Invalid status: {dto.Status}. Must be Draft or Published.");

        var input = new CreateAssignmentInput(dto.Title, dto.Description, dto.TeacherSubjectAssignmentId, dto.Deadline, dto.MaxMarks, status, CurrentUserId);
        var created = await _assignmentService.CreateAsync(input);
        // Reload with navigation props and return DTO — never serialize EF entity graphs
        // (TeacherSubjectAssignment.Assignments causes infinite JSON cycles).
        var a = await _assignmentService.GetByIdAsync(created.Id) ?? created;
        return CreatedAtAction(nameof(GetById), new { id = a.Id }, MapToDto(a));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Teacher")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAssignmentDto dto)
    {
        AssignmentStatus? status = null;
        if (dto.Status != null)
        {
            if (!Enum.TryParse<AssignmentStatus>(dto.Status, true, out var s))
                throw new AssignmentSystem.Api.Exceptions.ValidationException($"Invalid status: {dto.Status}.");
            status = s;
        }

        var input = new UpdateAssignmentInput(dto.Title, dto.Description, dto.Deadline, dto.MaxMarks, status, CurrentUserId);
        await _assignmentService.UpdateAsync(id, input, CurrentUserId);
        var a = await _assignmentService.GetByIdAsync(id)
            ?? throw new AssignmentSystem.Api.Exceptions.NotFoundException($"Assignment with id {id} not found.");
        return Ok(MapToDto(a));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Teacher")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        await _assignmentService.DeleteAsync(id, CurrentUserId);
        return NoContent();
    }

    private static AssignmentDto MapToDto(Assignment a) => new(
        a.Id, a.Title, a.Description, a.TeacherSubjectAssignmentId,
        a.Deadline, a.MaxMarks, a.Status.ToString(), a.CreatedAt, a.UpdatedAt,
        a.TeacherSubjectAssignment?.Teacher?.FullName ?? "",
        a.TeacherSubjectAssignment?.Subject?.Name ?? "",
        a.TeacherSubjectAssignment?.ClassCourse?.Name ?? ""
    );
}
