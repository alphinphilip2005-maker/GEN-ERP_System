import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PurchaseRequest {
  id?: number;
  pr_no: string;
  request_date: string;
  requested_by_id: number;
  designation?: string;
  department?: string;
  project_id?: number | null;
  product_id?: string;
  qc_required?: boolean;
  bom_revision_id?: number | null;
  remarks?: string;
  status: string;
  Requester?: { name: string };
  Project?: { project_name: string, project_code: string };
  PurchaseRequestItems?: any[];
}

export interface PurchaseRequestItem {
  id?: number;
  pr_id?: number;
  item_id: number;
  quantity: number;
  uom?: string;
  unit_price?: number;
  tax_percent?: number;
  total_price?: number;
  links_remarks_contact?: string;
  is_bom_item?: boolean;
  line_status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PurchaseRequestService {
  private apiUrl = 'http://localhost:3000/api/purchase-requests';

  constructor(private http: HttpClient) {}

  getPurchaseRequests(): Observable<PurchaseRequest[]> {
    return this.http.get<PurchaseRequest[]>(this.apiUrl);
  }

  getNextPrNumber(dept: string): Observable<{ nextPrNo: string }> {
    return this.http.get<{ nextPrNo: string }>(`${this.apiUrl}/next-number`, { params: { dept } });
  }

  getApprovedBoms(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/approved-boms/${projectId}`);
  }

  getBomItems(revisionId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/bom-items/${revisionId}`);
  }

  createPurchaseRequest(pr: any): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(this.apiUrl, pr);
  }

  getPurchaseRequest(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  updatePurchaseRequest(id: number, pr: any): Observable<PurchaseRequest> {
    return this.http.put<PurchaseRequest>(`${this.apiUrl}/${id}`, pr);
  }

  updateStatus(id: number, status: string, items?: any[]): Observable<PurchaseRequest> {
    return this.http.put<PurchaseRequest>(`${this.apiUrl}/${id}/status`, { status, items });
  }

  deletePurchaseRequest(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  updatePurchaseRequestStatus(id: number, status: string, remarks?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status, remarks });
  }

  getPendingPurchaseRequests(): Observable<PurchaseRequest[]> {
    return this.http.get<PurchaseRequest[]>(`${this.apiUrl}?status=Submitted`);
  }
}
