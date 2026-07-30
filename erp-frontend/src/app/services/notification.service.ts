import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  type: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = 'http://localhost:3000/api/notifications';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getNotifications(): Observable<Notification[]> {
    const user = this.authService.getCurrentUser();
    if (!user) return new Observable(sub => { sub.next([]); sub.complete(); });
    return this.http.get<Notification[]>(`${this.apiUrl}/user/${user.id}`);
  }

  markAsRead(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<any> {
    const user = this.authService.getCurrentUser();
    if (!user) return new Observable(sub => { sub.next(null); sub.complete(); });
    return this.http.patch(`${this.apiUrl}/user/${user.id}/read-all`, {});
  }

  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
