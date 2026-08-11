using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Services;
using AssignmentSystem.Api.Middleware;
using AssignmentSystem.Api.Models;
using AssignmentSystem.Api.DTOs;

var builder = WebApplication.CreateBuilder(args);

// Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();
builder.Host.UseSerilog();

// DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IClassCourseService, ClassCourseService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();
builder.Services.AddScoped<ITeacherSubjectAssignmentService, TeacherSubjectAssignmentService>();
builder.Services.AddScoped<IAssignmentService, AssignmentService>();
builder.Services.AddScoped<ISubmissionService, SubmissionService>();

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Secret"] ?? "DefaultDevSecretKeyAtLeast32Characters!!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "AssignmentSystem",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "AssignmentSystem",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            NameClaimType = System.Security.Claims.ClaimTypes.Name,
            RoleClaimType = System.Security.Claims.ClaimTypes.Role
        };
    });
builder.Services.AddAuthorization();

// FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Controllers
builder.Services.AddControllers();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Assignment System API", Version = "v1", Description = "A role-based Assignment & Submission Management System" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter your JWT token.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"]?.Split(",", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (allowedOrigins == null || allowedOrigins.Length == 0)
        {
            // No origins configured — allow all without credentials
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
        else
        {
            policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
        }
    });
});

// Health Checks
builder.Services.AddHealthChecks();

var app = builder.Build();

// Middleware
app.UseMiddleware<GlobalExceptionMiddleware>();

// Swagger (always on for this project)
app.UseSwagger();
app.UseSwaggerUI();

// HTTPS Redirection (only in production — dev cert is untrusted locally)
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// CORS
app.UseCors();

// Auth
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

// Auto-migrate and seed
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        if (db.Database.ProviderName != "Microsoft.EntityFrameworkCore.InMemory")
        {
            db.Database.Migrate();
        }
        await SeedData.SeedAsync(db);
    }
    catch (Exception ex)
    {
        Log.Error(ex, "An error occurred while migrating or seeding the database.");
    }
}

app.Run();

public partial class Program { }

// Validators
public class LoginRequestValidator : AbstractValidator<LoginRequestDto>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
    }
}

public class CreateUserValidator : AbstractValidator<CreateUserDto>
{
    public CreateUserValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
        RuleFor(x => x.Role).NotEmpty().Must(r => r == "Admin" || r == "Teacher" || r == "Student")
            .WithMessage("Role must be Admin, Teacher, or Student.");
    }
}

public class CreateAssignmentValidator : AbstractValidator<CreateAssignmentDto>
{
    public CreateAssignmentValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.TeacherSubjectAssignmentId).GreaterThan(0);
        RuleFor(x => x.Deadline).GreaterThan(DateTime.UtcNow);
        RuleFor(x => x.MaxMarks).GreaterThan(0);
        RuleFor(x => x.Status).NotEmpty().Must(s => s == "Draft" || s == "Published")
            .WithMessage("Status must be Draft or Published.");
    }
}

public class CreateSubmissionValidator : AbstractValidator<CreateSubmissionDto>
{
    public CreateSubmissionValidator()
    {
        RuleFor(x => x.Content).NotEmpty();
    }
}

public class GradeSubmissionValidator : AbstractValidator<GradeSubmissionDto>
{
    public GradeSubmissionValidator()
    {
        RuleFor(x => x.Marks).GreaterThanOrEqualTo(0);
    }
}

public class UpdateSubmissionStatusValidator : AbstractValidator<UpdateSubmissionStatusDto>
{
    public UpdateSubmissionStatusValidator()
    {
        RuleFor(x => x.Status).NotEmpty().Must(s => s == "Submitted" || s == "Late" || s == "Graded" || s == "ReturnedForRevision")
            .WithMessage("Status must be Submitted, Late, Graded, or ReturnedForRevision.");
    }
}
