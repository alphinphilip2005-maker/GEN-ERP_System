import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Item } from './item.service';

export interface Stock {
  id?: number;
  item_id: number;
  quantity: number;
  bad_quantity?: number;
  location?: string;
  Item?: Item;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryHistoryEntry {
  id?: number;
  item_id: number;
  quantity: number;
  type: 'PR_Flow' | 'Project_Transfer' | 'Material_Rejection';
  source_reference?: string;
  from_project?: string;
  to_project?: string;
  movement_details?: string;
  user_name?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private apiUrl = 'http://localhost:3000/api/inventory';

  constructor(private http: HttpClient) {}

  getStockLevels(): Observable<Stock[]> {
    return this.http.get<Stock[]>(this.apiUrl);
  }

  adjustStock(adjustment: { item_id: number, quantity: number, type: 'add' | 'subtract' }): Observable<Stock> {
    return this.http.post<Stock>(`${this.apiUrl}/adjust`, adjustment);
  }

  getItemHistory(itemId: number): Observable<InventoryHistoryEntry[]> {
    return this.http.get<InventoryHistoryEntry[]>(`${this.apiUrl}/history/${itemId}`);
  }
}
