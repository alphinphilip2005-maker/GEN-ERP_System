import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ItemCategory {
  id?: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ItemCategoryService {
  private apiUrl = 'http://localhost:3000/api/item-categories';

  constructor(private http: HttpClient) {}

  getCategories(): Observable<ItemCategory[]> {
    return this.http.get<ItemCategory[]>(this.apiUrl);
  }

  createCategory(category: ItemCategory): Observable<ItemCategory> {
    return this.http.post<ItemCategory>(this.apiUrl, category);
  }

  updateCategory(id: number, category: ItemCategory): Observable<ItemCategory> {
    return this.http.put<ItemCategory>(`${this.apiUrl}/${id}`, category);
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
