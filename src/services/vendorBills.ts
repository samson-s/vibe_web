import api from './api';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface VendorBill {
  id: string;
  bill_number: string;
  vendor_id?: string | null;
  amount: number;
  tax?: number | null;
  status: string;
  description?: string | null;
  due_date?: string | null;
  user_id: string;
  items: LineItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateLineItemRequest {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface CreateVendorBillRequest {
  bill_number: string;
  vendor_id?: string | null;
  amount: number;
  tax?: number | null;
  status?: string;
  description?: string | null;
  due_date?: string | null;
  items?: CreateLineItemRequest[];
}

export interface UpdateVendorBillRequest {
  bill_number?: string | null;
  vendor_id?: string | null;
  amount?: number | null;
  tax?: number | null;
  status?: string | null;
  description?: string | null;
  due_date?: string | null;
  items?: CreateLineItemRequest[] | null;
}

export async function listVendorBills(): Promise<VendorBill[]> {
  const res = await api.get<VendorBill[]>('/vendor-bills');
  return res.data;
}

export async function getVendorBill(id: string): Promise<VendorBill> {
  const res = await api.get<VendorBill>(`/vendor-bills/${id}`);
  return res.data;
}

export async function createVendorBill(data: CreateVendorBillRequest): Promise<VendorBill> {
  const res = await api.post<VendorBill>('/vendor-bills', data);
  return res.data;
}

export async function updateVendorBill(id: string, data: UpdateVendorBillRequest): Promise<VendorBill> {
  const res = await api.put<VendorBill>(`/vendor-bills/${id}`, data);
  return res.data;
}

export async function deleteVendorBill(id: string): Promise<void> {
  await api.delete(`/vendor-bills/${id}`);
}

export async function addVendorBillItem(billId: string, data: CreateLineItemRequest): Promise<LineItem> {
  const res = await api.post<LineItem>(`/vendor-bills/${billId}/items`, data);
  return res.data;
}

export async function updateVendorBillItem(billId: string, itemId: string, data: Partial<CreateLineItemRequest>): Promise<LineItem> {
  const res = await api.put<LineItem>(`/vendor-bills/${billId}/items/${itemId}`, data);
  return res.data;
}

export async function deleteVendorBillItem(billId: string, itemId: string): Promise<void> {
  await api.delete(`/vendor-bills/${billId}/items/${itemId}`);
}
