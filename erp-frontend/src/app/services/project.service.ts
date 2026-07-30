import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProjectLead {
  id: number;
  name: string;
  email: string;
}

export interface Project {
  id?: number;
  project_code: string;
  project_name: string;
  project_lead_id?: number | null;
  Lead?: ProjectLead;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = 'http://localhost:3000/api/projects';

  constructor(private http: HttpClient) {}

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl);
  }

  createProject(project: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, project);
  }

  updateProject(id: number, project: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/${id}`, project);
  }

  deleteProject(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /** Generic GET helper used by other components (e.g., MRN BOM import) */
  getApi(path: string): Observable<any> {
    return this.http.get<any>(`http://localhost:3000/api/${path}`);
  }
}
