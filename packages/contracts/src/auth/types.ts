export interface RegisterRequest {
  tenantName: string;
  email: string;
  password: string;
  timezone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CurrentUser {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}
