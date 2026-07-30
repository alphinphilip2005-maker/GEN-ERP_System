import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MaterialRejection {
  id: number;
  rejection_no: string;
  grn_id: number;
  item_id: number;
  vendor_id: number;
  project_id?: number;
  received_qty: number;
  rejected_qty: number;
  reason?: string;
  action_taken?: string;
  remarks?: string;
  root_cause?: string;
  disposition?: string;
  draft_action_taken?: string;
  draft_remarks?: string;
  draft_root_cause?: string;
  draft_disposition?: string;
  draft_status?: string;
  isEditing?: boolean;
  editingAction?: boolean;
  editingRemarks?: boolean;
  editingRootCause?: boolean;
  status: string;
  closing_date?: string;
  created_at: string;
  media_urls?: string;
  Item?: { item_code: string; item_name: string };
  Vendor?: { name: string; vendor_code: string };
  Project?: { project_name: string };
  Grn?: { grn_no: string };
}

@Injectable({
  providedIn: 'root'
})
export class MaterialRejectionService {
  private apiUrl = 'http://localhost:3000/api/material-rejections';

  constructor(private http: HttpClient) {}

  getRejections(): Observable<MaterialRejection[]> {
    return this.http.get<MaterialRejection[]>(this.apiUrl);
  }

  updateRejection(id: number, data: any): Observable<MaterialRejection> {
    return this.http.patch<MaterialRejection>(`${this.apiUrl}/${id}`, data);
  }

  approveRejection(id: number, data: { approved: boolean; comments?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/approve`, data);
  }
}
