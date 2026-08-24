export const EmployeeRole = {
  Employee: 0,
  LineManager: 1,
  HR: 2,
  SafetyOfficer: 3,
  Medical: 4,
  Security: 5,
  Executive: 6,
} as const;

export type EmployeeRole = (typeof EmployeeRole)[keyof typeof EmployeeRole];

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  employeeId: string;
  fullName: string;
  role: EmployeeRole;
  refreshToken: string;
}

export interface Session {
  employeeId: string;
  fullName: string;
  role: EmployeeRole;
  expiresAtUtc: string;
}
