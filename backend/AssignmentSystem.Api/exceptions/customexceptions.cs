namespace AssignmentSystem.Api.Exceptions;

public class ForbiddenException : Exception
{
    public ForbiddenException(string message = "You do not have permission to perform this action.") : base(message) { }
}

public class NotFoundException : Exception
{
    public NotFoundException(string message = "Resource not found.") : base(message) { }
}

public class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
}

public class DeadlinePassedException : Exception
{
    public DeadlinePassedException(string message = "The deadline for this assignment has passed.") : base(message) { }
}

public class DuplicateSubmissionException : Exception
{
    public DuplicateSubmissionException(string message = "A submission already exists for this assignment by this student.") : base(message) { }
}

public class InvalidMarksException : Exception
{
    public InvalidMarksException(string message = "Marks must be between 0 and the assignment's maximum marks.") : base(message) { }
}

public class BusinessRuleException : Exception
{
    public BusinessRuleException(string message) : base(message) { }
}
