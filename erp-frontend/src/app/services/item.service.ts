import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Item {
  id?: number;
  item_code: string;
  item_name: string;
  description: string;
  category: string;
  uom: string;
  brand: string;
  material: string;
  created_at?: string;
  updated_at?: string;
  Stock?: { quantity: number; id?: number; item_id?: number };
  tempQuantity?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private apiUrl = 'http://localhost:3000/api/items';

  constructor(private http: HttpClient) {}

  getItems(location?: string, projectName?: string): Observable<Item[]> {
    let url = this.apiUrl;
    const params = [];
    if (location) params.push(`location=${encodeURIComponent(location)}`);
    if (projectName) params.push(`project_name=${encodeURIComponent(projectName)}`);
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    return this.http.get<Item[]>(url);
  }

  checkDuplicateCode(code: string): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/check-code/${code}`);
  }

  getItem(id: number): Observable<Item> {
    return this.http.get<Item>(`${this.apiUrl}/${id}`);
  }

  createItem(item: Item): Observable<Item> {
    return this.http.post<Item>(this.apiUrl, item);
  }

  updateItem(id: number, item: Partial<Item>): Observable<Item> {
    return this.http.put<Item>(`${this.apiUrl}/${id}`, item);
  }

  deleteItem(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  uploadExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload`, formData);
  }
}
