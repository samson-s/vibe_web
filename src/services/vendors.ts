import api from './api';

export interface Vendor {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVendorRequest {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface UpdateVendorRequest {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export async function listVendors(): Promise<Vendor[]> {
  const res = await api.get<Vendor[]>('/vendors');
  return res.data;
}

export async function getVendor(id: string): Promise<Vendor> {
  const res = await api.get<Vendor>(`/vendors/${id}`);
  return res.data;
}

export async function createVendor(data: CreateVendorRequest): Promise<Vendor> {
  const res = await api.post<Vendor>('/vendors', data);
  return res.data;
}

export async function updateVendor(id: string, data: UpdateVendorRequest): Promise<Vendor> {
  const res = await api.put<Vendor>(`/vendors/${id}`, data);
  return res.data;
}

export async function deleteVendor(id: string): Promise<void> {
  await api.delete(`/vendors/${id}`);
}
