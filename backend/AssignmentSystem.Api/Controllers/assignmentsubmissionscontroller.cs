using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AssignmentSystem.Api.Services;
using AssignmentSystem.Api.Models;
using AssignmentSystem.Api.DTOs;

namespace AssignmentSystem.Api.Controllers;

[ApiController]
[Route("api/assignments/{assignmentId}/submissions")]
[Authorize]
public class AssignmentSubmissionsController : ControllerBase
{
    private readonly ISubmissionService _submissionService;

    public AssignmentSubmissionsController(ISubmissionService submissionService)
    {
        _submissionService = submissionService;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub")!.Value);
    private bool IsAdmin => (User.FindFirstValue(ClaimTypes.Role) ?? "") == "Admin";

    [HttpGet]
    [Authorize(Roles = "Teacher,Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSubmissionsForAssignment(int assignmentId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var submissions = await _submissionService.GetSubmissionsForAssignmentAsync(assignmentId, CurrentUserId, IsAdmin, page, pageSize);
        return Ok(submissions.Select(s => new SubmissionDto(
            s.Id, s.AssignmentId, s.StudentId, s.Student?.FullName ?? "",
            s.Content, s.SubmittedAt, s.UpdatedAt, s.Status.ToString(),
            s.Marks, s.Feedback, s.GradedAt, s.GradedByUserId
        )));
    }
}
