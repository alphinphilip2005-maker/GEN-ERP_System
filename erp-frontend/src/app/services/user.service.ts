import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  employee_id: string;
  designation: string;
  department: string;
  phone: string;
  Permissions?: Permission[];
}

export interface Permission {
  id: number;
  module_id: number;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_create: boolean;
  Module?: { id: number; module_name: string };
}

export interface Module {
  id: number;
  module_name: string;
}

export interface UserRight {
  module_id: number;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_create: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  createUser(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/users`, payload);
  }

  updateUser(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}`, payload);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`);
  }

  getModules(): Observable<Module[]> {
    return this.http.get<Module[]>(`${this.apiUrl}/modules`);
  }

  getUserRights(id: number): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/users/${id}/rights`);
  }

  updateUserRights(id: number, rights: UserRight[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}/rights`, { rights });
  }
}
