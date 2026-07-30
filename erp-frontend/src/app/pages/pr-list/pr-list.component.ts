import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PurchaseRequestService, PurchaseRequest } from '../../services/purchase-request.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-pr-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './pr-list.component.html',
  styleUrls: ['./pr-list.component.css']
})
export class PrListComponent implements OnInit {
  prs: PurchaseRequest[] = [];
  filteredPrs: PurchaseRequest[] = [];
  searchQuery = '';
  loading = true;
  error = '';

  activeTab: 'all' | 'approved' = 'all';

  currentPage = 1;
  pageSize = 9;
  get canCreate(): boolean {
    return this.authService.hasPermission('Purchase Request', 'can_create');
  }

  get canDelete(): boolean {
    return this.authService.hasPermission('Purchase Request', 'can_delete');
  }

  currentUser: any = null;

  constructor(
    private prService: PurchaseRequestService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadPrs();
  }

  get canSeeAllPrs(): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin') return true;
    return this.authService.hasPermission('Purchase Request', 'can_view');
  }

  canEditPr(pr: PurchaseRequest): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin') return true;
    return this.authService.hasPermission('Purchase Request', 'can_edit') && this.isOwner(pr);
  }

  isOwner(pr: PurchaseRequest): boolean {
    return pr.requested_by_id === this.currentUser?.id;
  }

  isLocked(pr: PurchaseRequest): boolean {
    return pr.status === 'Submitted' || pr.status === 'Closed' || pr.status === 'Approved';
  }

  loadPrs() {
    this.loading = true;
    this.prService.getPurchaseRequests().subscribe({
      next: (data) => {
        this.prs = data;
        this.filterPrs();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load purchase requests: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  filterPrs() {
    let baseList = this.activeTab === 'approved' 
      ? this.prs.filter(pr => pr.status === 'Approved') 
      : [...this.prs];

    if (!this.searchQuery.trim()) {
      this.filteredPrs = baseList;
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredPrs = baseList.filter(pr => 
        pr.pr_no.toLowerCase().includes(q) ||
        (pr.Project?.project_name || '').toLowerCase().includes(q) ||
        (pr.Requester?.name || '').toLowerCase().includes(q) ||
        pr.status.toLowerCase().includes(q)
      );
    }
    this.currentPage = 1;
  }

  get paginatedPrs(): PurchaseRequest[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredPrs.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredPrs.length / this.pageSize) || 1;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
    }
  }

  setTab(tab: 'all' | 'approved') {
    this.activeTab = tab;
    this.filterPrs();
  }

  getStatusClass(status: string): string {
    const s = status.toLowerCase();
    if (s === 'submitted') return 'status-submitted'; // Blue
    if (s === 'approved') return 'status-approved'; // Green
    if (s === 'draft' || s === 'rejected') return 'status-draft'; // Grey
    if (s === 'closed') return 'status-closed';
    return '';
  }

  getDisplayStatus(status: string): string {
    const s = status.toLowerCase();
    if (s === 'submitted') return 'Released';
    if (s === 'approved') return 'Approved';
    if (s === 'rejected' || s === 'draft') return 'Draft';
    return status;
  }

  deletePr(pr: PurchaseRequest) {
    if (!confirm(`Are you sure you want to delete PR "${pr.pr_no}"? This action cannot be undone.`)) {
      return;
    }
    this.prService.deletePurchaseRequest(pr.id!).subscribe({
      next: () => {
        this.prs = this.prs.filter(p => p.id !== pr.id);
        this.filterPrs();
      },
      error: (err) => {
        alert('Failed to delete PR: ' + (err.error?.message || err.message));
      }
    });
  }
}
