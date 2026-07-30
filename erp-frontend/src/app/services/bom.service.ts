import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Item } from './item.service';

export interface BomProject {
  id?: number;
  project_name: string;
  current_revision?: string;
  released_on?: string;
  uploaded_by?: string;
  created_at?: string;
  updated_at?: string;
  BomItems?: BomItem[];
  BomRevisions?: BomRevision[];
}

export interface BomItem {
  id?: number;
  bom_project_id?: number;
  item_id: number;
  quantity: number;
  assembly?: string;
  rate?: number;
  price?: number;
  actual_qty?: number;
  vendor_name?: string;
  remarks?: string;
  Item?: Item;
}

export interface BomRevision {
  id?: number;
  bom_project_id?: number;
  revision_no: string;
  change_description: string;
  revised_on: string;
  revised_by: string;
  approved_by?: string;
  is_approved?: boolean;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at?: string;
}


@Injectable({
  providedIn: 'root'
})
export class BomService {
  private apiUrl = 'http://localhost:3000/api/boms';

  constructor(private http: HttpClient) {}

  getBomProjects(): Observable<BomProject[]> {
    return this.http.get<BomProject[]>(this.apiUrl);
  }

  getBomProject(id: number): Observable<BomProject> {
    return this.http.get<BomProject>(`${this.apiUrl}/${id}`);
  }

  createBomProject(project: Partial<BomProject>): Observable<BomProject> {
    return this.http.post<BomProject>(this.apiUrl, project);
  }

  updateBomProject(id: number, payload: { items: any[]; change_description?: string; revised_by?: string; is_draft?: boolean }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, payload);
  }

  deleteBomProject(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  parseBomExcel(file: File): Observable<{ validItems: any[], missingItems: any[], summary: any }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ validItems: any[], missingItems: any[], summary: any }>(`${this.apiUrl}/parse-excel`, formData);
  }

  approveRevision(revisionId: number, is_approved: boolean, approved_by: string, status?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/revisions/${revisionId}/approve`, { is_approved, approved_by, status });
  }

  getRevisionItems(revisionId: number): Observable<BomItem[]> {
    return this.http.get<BomItem[]>(`${this.apiUrl}/revisions/${revisionId}/items`);
  }

  getRevisionDiff(revisionId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/revisions/${revisionId}/diff`);
  }

  downloadTemplate(): void {
    window.open(`${this.apiUrl}/template`, '_blank');
  }
}
