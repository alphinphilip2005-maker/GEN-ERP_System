import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Quote {
  id?: number;
  pr_item_id: number;
  vendor_id: number;
  price: number;
  delivery_time?: string;
  remarks?: string;
  status?: string;
  quote_url?: string;
  quote_no?: string;
  Vendor?: any;
}

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  private apiUrl = 'http://localhost:3000/api/quotes';

  constructor(private http: HttpClient) {}

  addQuote(quoteData: Quote): Observable<Quote> {
    return this.http.post<Quote>(this.apiUrl, quoteData);
  }

  bulkImportQuotes(pr_item_id: number, quotes: any[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bulk-import`, { pr_item_id, quotes });
  }

  getQuotesByPrItem(prItemId: number): Observable<Quote[]> {
    return this.http.get<Quote[]>(`${this.apiUrl}/pr-item/${prItemId}`);
  }

  getAllActiveQuotes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all-active`);
  }

  updateQuoteStatus(id: number, status: string): Observable<Quote> {
    return this.http.put<Quote>(`${this.apiUrl}/${id}/status`, { status });
  }

  selectQuote(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/select`, {});
  }

  uploadQuoteFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`http://localhost:3000/api/upload`, formData);
  }

  deleteQuote(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
