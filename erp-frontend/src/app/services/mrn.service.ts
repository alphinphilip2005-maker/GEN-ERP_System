import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MrnService {
  private apiUrl = 'http://localhost:3000/api/mrn';

  constructor(private http: HttpClient) { }

  getMrns(page: number = 1, limit: number = 10, search: string = '', type: string = ''): Observable<any> {
    return this.http.get(`${this.apiUrl}?page=${page}&limit=${limit}&search=${search}&type=${type}`);
  }

  getNextMrnNumber(): Observable<any> {
    return this.http.get(`${this.apiUrl}/next-number`);
  }

  getMrn(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  createMrn(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  approveMrn(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/approve`, {});
  }

  issueMaterials(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/issue`, data);
  }

  deleteMrn(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getProjectItems(projectId: number, location?: string): Observable<any> {
    let url = `${this.apiUrl}/project-items/${projectId}`;
    if (location) url += `?location=${encodeURIComponent(location)}`;
    return this.http.get(url);
  }
}
