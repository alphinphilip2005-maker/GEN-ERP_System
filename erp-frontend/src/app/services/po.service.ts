import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:3000/api/po';

export interface PurchaseOrderItem {
  id?: number;
  item_id: number;
  custom_item_name?: string;
  quantity: number;
  uom: string;
  vendor_id?: number;
  amount: number;
  unit_price?: number;
  total_price?: number;
  Item?: any;
}

export interface PurchaseOrder {
  id?: number;
  po_no: string;
  po_date: string;
  sanction_code: string;
  pr_id: number;
  pr_no?: string;
  pq_id?: number;
  project_name: string;
  teams: string;
  pq_no: string;
  to_vendor_id: number;
  from_branch: string;
  purchase_manager_id: number;
  upload_po: string;
  terms_conditions: string;
  is_approved?: boolean;
  approved_by_id?: number;
  warehouse?: string;
  all_warehouses?: string;
  status?: string;
  created_at?: string;
  PurchaseRequest?: any;
  ToVendor?: any;
  PurchaseManager?: any;
  Items?: PurchaseOrderItem[];
}

@Injectable({
  providedIn: 'root'
})
export class PoService {
  constructor(private http: HttpClient) { }

  getPurchaseOrders(): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(API_URL);
  }

  getPurchaseOrder(id: number): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${API_URL}/${id}`);
  }

  createPurchaseOrder(po: PurchaseOrder, items: PurchaseOrderItem[]): Observable<PurchaseOrder[]> {
    return this.http.post<PurchaseOrder[]>(API_URL, { ...po, items });
  }

  markReceived(id: number): Observable<any> {
    return this.http.post(`${API_URL}/${id}/receive`, {});
  }

  deletePurchaseOrder(id: number): Observable<any> {
    return this.http.delete(`${API_URL}/${id}`);
  }

  approvePO(id: number, is_approved: boolean, approved_by_id: number): Observable<any> {
    return this.http.patch(`${API_URL}/${id}/approve`, { is_approved, approved_by_id });
  }

  updateWarehouse(id: number, warehouse: string): Observable<any> {
    return this.http.patch(`${API_URL}/${id}/warehouse`, { warehouse });
  }

  updateDocument(id: number, upload_po: string): Observable<any> {
    return this.http.patch(`${API_URL}/${id}/document`, { upload_po });
  }

  sendToVendor(id: number): Observable<any> {
    return this.http.post(`${API_URL}/${id}/send-to-vendor`, {});
  }
}
