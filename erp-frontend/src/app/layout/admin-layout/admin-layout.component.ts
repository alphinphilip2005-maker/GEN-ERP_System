import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationBellComponent],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent implements OnInit {
  currentUser: any = null;
  sidebarCollapsed = false;

  navItems = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard' },
    { label: 'User Management', route: '/admin/users', icon: 'users', adminOnly: true },
    { label: 'Item Category', route: '/admin/item-categories', icon: 'list' },
    { label: 'UOM Master', route: '/admin/uom', icon: 'list' },
    { label: 'Project Master', route: '/admin/projects', icon: 'list' },
    { label: 'Vendor Master', route: '/admin/vendors', icon: 'users' },
    { label: 'Item Master', route: '/admin/items', icon: 'bom' }
  ];

  erpModules = [
    { label: 'BOM', route: '/admin/bom', icon: 'bom' },
    { label: 'Purchase Request', route: '/admin/purchase-requests', icon: 'pr' },
    { label: 'Quotation Management', route: '/admin/quotation-management', icon: 'quote' },
    { label: 'Purchase Order', route: '/admin/po', icon: 'po' },
    { label: 'GRN', route: '/admin/grn', icon: 'grn' },
    { label: 'IQC', route: '/admin/iqc', icon: 'iqc' },
    { label: 'Material Rejection Log', route: '/admin/rejection-log', icon: 'rejection' },
    { label: 'Inventory', route: '/admin/inventory', icon: 'stock' },
    { label: 'MRN', route: '/admin/mrn', icon: 'mrn' },
    { label: 'Payment', route: '/admin/payment-management', icon: 'so' }
  ];

  mainExpanded = true;
  erpExpanded = true;

  constructor(private authService: AuthService) {}

  toggleMain() {
    this.mainExpanded = !this.mainExpanded;
  }

  toggleErp() {
    this.erpExpanded = !this.erpExpanded;
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    
    // 🚀 DYNAMIC RBAC HYDRATION:
    // Fetch fresh permissions from db dynamically to ensure instant policy enforcement on every reload!
    if (this.authService.isLoggedIn()) {
      this.authService.loadProfile().subscribe({
        next: (freshUser) => {
          this.currentUser = freshUser; // Instantly applied to active rendering logic!
        },
        error: () => {
          // Fallback to existing local storage session if server temporarily offline
        }
      });
    }
  }

  get filteredNavItems() {
    if (!this.currentUser) return [];
    return this.navItems.filter(item => {
      // Dashboard is always visible
      if (item.label === 'Dashboard') return true;
      // Admin only modules
      if (item.adminOnly && !this.isAdmin) return false;
      
      // RBAC check for Master modules
      if (item.label === 'Vendor Master' || item.label === 'Item Master' || item.label === 'Item Category' || item.label === 'UOM Master' || item.label === 'Project Master') {
        if (this.isAdmin) return true;
        const perms = this.currentUser.permissions || [];
        return perms.some((p: any) => p.module === item.label && p.can_view);
      }
      
      return true;
    });
  }

  get filteredErpModules() {
    if (!this.currentUser) return [];
    // Admins see everything
    if (this.isAdmin) return this.erpModules;

    const perms = this.currentUser.permissions || [];
    return this.erpModules.filter(mod => {
      // Default STRICT Dynamic RBAC check
      return perms.some((p: any) => {
        const pMod = p.module;
        return pMod === mod.label && p.can_view;
      });
    });
  }

  get isAdmin(): boolean {
    return this.currentUser?.role?.toLowerCase() === 'admin';
  }

  logout() {
    this.authService.logout();
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  getInitials(): string {
    if (!this.currentUser?.name) return 'U';
    const parts = this.currentUser.name.split(' ');
    return parts.map((p: string) => p[0]).join('').toUpperCase().slice(0, 2);
  }
}
