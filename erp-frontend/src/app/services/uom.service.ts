import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Uom {
  id?: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UomService {
  private apiUrl = 'http://localhost:3000/api/uom';

  constructor(private http: HttpClient) {}

  getUoms(): Observable<Uom[]> {
    return this.http.get<Uom[]>(this.apiUrl);
  }

  createUom(uom: Uom): Observable<Uom> {
    return this.http.post<Uom>(this.apiUrl, uom);
  }

  updateUom(id: number, uom: Uom): Observable<Uom> {
    return this.http.put<Uom>(`${this.apiUrl}/${id}`, uom);
  }

  deleteUom(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
