import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:3000/api/payments';

export interface PaymentHistory {
  id?: number;
  payment_id: number;
  amount: number;
  payment_date: string;
  mode: string;
  reference_no?: string;
  remarks?: string;
  created_at?: string;
}

export interface Payment {
  id: number;
  po_id: number;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  settlement_type: string;
  status: 'OPEN' | 'PARTIAL' | 'CLOSED';
  PurchaseOrder?: any;
  PaymentHistories?: PaymentHistory[];
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  constructor(private http: HttpClient) { }

  getPayments(): Observable<Payment[]> {
    return this.http.get<Payment[]>(API_URL);
  }

  updatePayment(id: number, data: { due_date?: string, settlement_type?: string }): Observable<Payment> {
    return this.http.patch<Payment>(`${API_URL}/${id}`, data);
  }

  settlePayment(id: number, settlementData: any): Observable<any> {
    return this.http.post(`${API_URL}/${id}/settle`, settlementData);
  }
}
