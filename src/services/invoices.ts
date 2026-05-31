import api from './api';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
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

export interface CreateInvoiceRequest {
  invoice_number: string;
  vendor_id?: string | null;
  amount: number;
  tax?: number | null;
  status?: string;
  description?: string | null;
  due_date?: string | null;
  items?: CreateLineItemRequest[];
}

export interface UpdateInvoiceRequest {
  invoice_number?: string | null;
  vendor_id?: string | null;
  amount?: number | null;
  tax?: number | null;
  status?: string | null;
  description?: string | null;
  due_date?: string | null;
  items?: CreateLineItemRequest[] | null;
}

export async function listInvoices(): Promise<Invoice[]> {
  const res = await api.get<Invoice[]>('/invoices');
  return res.data;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const res = await api.get<Invoice>(`/invoices/${id}`);
  return res.data;
}

export async function createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
  const res = await api.post<Invoice>('/invoices', data);
  return res.data;
}

export async function updateInvoice(id: string, data: UpdateInvoiceRequest): Promise<Invoice> {
  const res = await api.put<Invoice>(`/invoices/${id}`, data);
  return res.data;
}

export async function deleteInvoice(id: string): Promise<void> {
  await api.delete(`/invoices/${id}`);
}

export async function addInvoiceItem(invoiceId: string, data: CreateLineItemRequest): Promise<LineItem> {
  const res = await api.post<LineItem>(`/invoices/${invoiceId}/items`, data);
  return res.data;
}

export async function updateInvoiceItem(invoiceId: string, itemId: string, data: Partial<CreateLineItemRequest>): Promise<LineItem> {
  const res = await api.put<LineItem>(`/invoices/${invoiceId}/items/${itemId}`, data);
  return res.data;
}

export async function deleteInvoiceItem(invoiceId: string, itemId: string): Promise<void> {
  await api.delete(`/invoices/${invoiceId}/items/${itemId}`);
}
