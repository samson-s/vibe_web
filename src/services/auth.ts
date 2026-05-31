import api from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string | null;
  last_name?: string | null;
}

export interface User {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', data);
  return res.data;
}

export async function register(data: RegisterRequest): Promise<User> {
  const res = await api.post<User>('/auth/register', data);
  return res.data;
}
