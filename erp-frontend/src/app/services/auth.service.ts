import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    employee_id: string;
    designation: string;
    department: string;
    role: string;
    permissions: Array<{
      module: string;
      can_view: boolean;
      can_edit: boolean;
      can_delete: boolean;
      can_create: boolean;
      can_approve: boolean;
    }>;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('erp_token', res.token);
        localStorage.setItem('erp_user', JSON.stringify(res.user));
      })
    );
  }
  
  loadProfile(): Observable<any> {
    const headers = { 'Authorization': `Bearer ${this.getToken()}` };
    return this.http.get<any>(`${this.apiUrl}/profile`, { headers }).pipe(
      tap(user => {
        localStorage.setItem('erp_user', JSON.stringify(user));
      })
    );
  }

  logout(): void {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('erp_token');
  }

  getCurrentUser() {
    const user = localStorage.getItem('erp_user');
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  hasPermission(moduleName: string, action: 'can_view' | 'can_edit' | 'can_delete' | 'can_create' | 'can_approve'): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    if (!user.permissions || user.permissions.length === 0) {
      if (user.role === 'admin') return true;
      return false;
    }
    
    const perm = user.permissions.find((p: any) => 
      p.module.toLowerCase().trim() === moduleName.toLowerCase().trim()
    );
    if (!perm) {
      if (user.role === 'admin') return true;
      return false;
    }
    
    return !!perm[action];
  }
}
