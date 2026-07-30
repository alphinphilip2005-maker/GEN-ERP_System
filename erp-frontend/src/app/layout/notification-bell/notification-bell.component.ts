import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css'
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  showDropdown = false;
  private refreshSub?: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();
    // Refresh every 30 seconds
    this.refreshSub = interval(30000).subscribe(() => this.loadNotifications());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe(notifs => {
      this.notifications = notifs;
      this.unreadCount = notifs.filter(n => !n.is_read).length;
    });
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
  }

  markAsRead(notif: Notification, event: Event): void {
    event.stopPropagation();
    if (!notif.is_read) {
      this.notificationService.markAsRead(notif.id).subscribe(() => {
        notif.is_read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      });
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.is_read = true);
      this.unreadCount = 0;
    });
  }

  deleteNotification(id: number, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(id).subscribe(() => {
      this.notifications = this.notifications.filter(n => n.id !== id);
      this.unreadCount = this.notifications.filter(n => !n.is_read).length;
    });
  }
}
