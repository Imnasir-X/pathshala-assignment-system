export interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  email: string;
  role: string;
  fullName: string;
}

export interface ClassCourse {
  id: number;
  name: string;
  section?: string;
  academicYear?: string;
}

export interface Subject {
  id: number;
  name: string;
  code?: string;
  classCourseId: number;
}

export interface TeacherSubjectAssignment {
  id: number;
  teacherId: number;
  teacherName: string;
  subjectId: number;
  subjectName: string;
  classCourseId: number;
  classCourseName: string;
}

export interface Assignment {
  id: number;
  title: string;
  description?: string;
  teacherSubjectAssignmentId: number;
  deadline: string;
  maxMarks: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  teacherName: string;
  subjectName: string;
  className: string;
}

export interface Submission {
  id: number;
  assignmentId: number;
  studentId: number;
  studentName: string;
  content: string;
  submittedAt: string;
  updatedAt?: string;
  status: string;
  marks?: number;
  feedback?: string;
  gradedAt?: string;
  gradedByUserId?: number;
}

export interface ApiError {
  title: string;
  detail: string;
  status: number;
}
