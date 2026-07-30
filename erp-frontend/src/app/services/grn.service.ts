import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GrnService {
  private apiUrl = 'http://localhost:3000/api/grn';
  private poUrl = 'http://localhost:3000/api/po';
  private uploadUrl = 'http://localhost:3000/api/upload';

  constructor(private http: HttpClient) { }

  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(this.uploadUrl, formData);
  }

  getAllGrns(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getGrns(): Observable<any[]> {
    return this.getAllGrns();
  }

  getGrnById(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createGrn(grnData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, grnData);
  }

  updateGrn(id: string | number, grnData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, grnData);
  }

  updateQc(id: string | number, qcData: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/qc`, qcData);
  }

  getAllPurchaseOrders(): Observable<any[]> {
    return this.http.get<any[]>(this.poUrl);
  }

  getPurchaseOrderById(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.poUrl}/${id}`);
  }
}
