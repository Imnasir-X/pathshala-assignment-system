using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AssignmentSystem.Api.Services;
using AssignmentSystem.Api.DTOs;

namespace AssignmentSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubmissionsController : ControllerBase
{
    private readonly ISubmissionService _service;

    public SubmissionsController(ISubmissionService service) { _service = service; }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub")!.Value);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role) ?? "";
    private bool IsAdmin => CurrentRole == "Admin";

    [HttpGet("mine")]
    [Authorize(Roles = "Student")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMySubmissions([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var submissions = await _service.GetMySubmissionsAsync(CurrentUserId, page, pageSize);
        return Ok(submissions.Select(s => MapToDto(s)));
    }

    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var s = await _service.GetByIdAsync(id);
        if (s == null) return NotFound();

        // Students can only see their own submissions
        if (CurrentRole == "Student" && s.StudentId != CurrentUserId)
            throw new AssignmentSystem.Api.Exceptions.ForbiddenException("You can only view your own submissions.");

        // Teachers can only see submissions for their own assignments
        if (CurrentRole == "Teacher" && s.Assignment?.TeacherSubjectAssignment?.TeacherId != CurrentUserId)
            throw new AssignmentSystem.Api.Exceptions.ForbiddenException("You can only view submissions for your own assignments.");

        return Ok(MapToDto(s));
    }

    [HttpPost("{assignmentId}")]
    [Authorize(Roles = "Student")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Submit(int assignmentId, [FromBody] CreateSubmissionDto dto)
    {
        var s = await _service.SubmitAsync(assignmentId, CurrentUserId, dto.Content);
        return CreatedAtAction(nameof(GetById), new { id = s.Id }, MapToDto(s));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Student")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSubmissionDto dto)
    {
        var s = await _service.UpdateAsync(id, CurrentUserId, dto.Content);
        return Ok(MapToDto(s));
    }

    [HttpPut("{id}/grade")]
    [Authorize(Roles = "Teacher,Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Grade(int id, [FromBody] GradeSubmissionDto dto)
    {
        var s = await _service.GradeAsync(id, CurrentUserId, dto.Marks, dto.Feedback, IsAdmin);
        return Ok(MapToDto(s));
    }

    [HttpPut("{id}/status")]
    [Authorize(Roles = "Teacher,Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateSubmissionStatusDto dto)
    {
        if (!Enum.TryParse<Models.SubmissionStatus>(dto.Status, out var status))
            return BadRequest(new { message = "Invalid status value. Must be Submitted, Late, Graded, or ReturnedForRevision." });

        var s = await _service.UpdateStatusAsync(id, CurrentUserId, status, IsAdmin);
        return Ok(MapToDto(s));
    }

    private static SubmissionDto MapToDto(Models.Submission s) => new(
        s.Id, s.AssignmentId, s.StudentId, s.Student?.FullName ?? "",
        s.Content, s.SubmittedAt, s.UpdatedAt, s.Status.ToString(),
        s.Marks, s.Feedback, s.GradedAt, s.GradedByUserId
    );
}
