import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Vendor {
  id?: number;
  vendor_code: string;
  name: string;
  street: string;
  city: string;
  state: string;
  country: string;
  pin: string;
  contact_person: string;
  phone: string;
  email: string;
  gst_number: string;
  pan: string;
  msme: string;
  contact_details: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  account_name?: string;
  branch_name?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VendorService {
  private apiUrl = 'http://localhost:3000/api/vendors';

  constructor(private http: HttpClient) {}

  getVendors(): Observable<Vendor[]> {
    return this.http.get<Vendor[]>(this.apiUrl);
  }

  getVendor(id: number): Observable<Vendor> {
    return this.http.get<Vendor>(`${this.apiUrl}/${id}`);
  }

  checkDuplicateCode(code: string): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/check-code/${code}`);
  }

  createVendor(vendor: Vendor): Observable<Vendor> {
    return this.http.post<Vendor>(this.apiUrl, vendor);
  }

  updateVendor(id: number, vendor: Vendor): Observable<Vendor> {
    return this.http.put<Vendor>(`${this.apiUrl}/${id}`, vendor);
  }

  deleteVendor(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
