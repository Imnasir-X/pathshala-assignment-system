using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AssignmentSystem.Api.Services;
using AssignmentSystem.Api.Models;
using AssignmentSystem.Api.DTOs;

namespace AssignmentSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    public UsersController(IUserService userService) { _userService = userService; }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var users = await _userService.GetAllAsync(page, pageSize);
        return Ok(users.Select(u => new UserDto(u.Id, u.FullName, u.Email, u.Role.ToString(), u.CreatedAt)));
    }

    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var u = await _userService.GetByIdAsync(id);
        if (u == null) return NotFound();
        return Ok(new UserDto(u.Id, u.FullName, u.Email, u.Role.ToString(), u.CreatedAt));
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        var u = await _userService.CreateAsync(dto.FullName, dto.Email, dto.Password, dto.Role);
        return CreatedAtAction(nameof(GetById), new { id = u.Id }, new UserDto(u.Id, u.FullName, u.Email, u.Role.ToString(), u.CreatedAt));
    }

    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto dto)
    {
        var u = await _userService.UpdateAsync(id, dto.FullName, dto.Email, dto.Role);
        return Ok(new UserDto(u.Id, u.FullName, u.Email, u.Role.ToString(), u.CreatedAt));
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        await _userService.DeleteAsync(id);
        return NoContent();
    }
}
