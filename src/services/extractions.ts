import api from './api';

export interface ExtractedLineItem {
  description: string;
  quantity: string;
  unit_price: string;
}

export interface ExtractedVendorBillData {
  bill_number: string;
  vendor_name: string;
  amount: string;
  tax?: string | null;
  description?: string | null;
  due_date?: string | null;
  items: ExtractedLineItem[];
}

export interface ExtractionDocument {
  id: string;
  extraction_job_id: string;
  filename: string;
  content_type: string;
  status: string;
  error_message?: string | null;
  extracted_data?: ExtractedVendorBillData | null;
  created_at: string;
}

export interface ExtractionJob {
  id: string;
  user_id: string;
  status: string;
  documents: ExtractionDocument[];
  created_at: string;
}

export async function listExtractions(): Promise<ExtractionJob[]> {
  const res = await api.get<ExtractionJob[]>('/extractions');
  return res.data;
}

export async function uploadForExtraction(files: File[]): Promise<ExtractionJob> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  const res = await api.post<ExtractionJob>('/vendor-bills/extract', formData);
  return res.data;
}

export async function getExtractionDocument(id: string): Promise<ExtractionDocument> {
  const res = await api.get<ExtractionDocument>(`/extractions/${id}`);
  return res.data;
}

export async function retryExtraction(id: string): Promise<ExtractionJob> {
  const res = await api.post<ExtractionJob>(`/extractions/${id}/retry`);
  return res.data;
}

export async function abortExtraction(id: string): Promise<ExtractionJob> {
  const res = await api.post<ExtractionJob>(`/extractions/${id}/abort`);
  return res.data;
}
