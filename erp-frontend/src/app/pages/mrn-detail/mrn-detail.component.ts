import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mrn-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mrn-detail.component.html',
  styleUrls: ['./mrn-detail.component.css']
})
export class MrnDetailComponent implements OnInit {
  mrnId: string | null = null;
  mrn: any = null;
  loading = true;
  error = '';

  canIssue = false;
  canDelete = false;
  canApprove = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.mrnId = this.route.snapshot.paramMap.get('id');
    const user = this.authService.getCurrentUser();
    const role = user?.role?.toLowerCase();
    
    // Admin, R&D Teams, and Store Teams can approve
    const isRDTeam = user?.department === 'R&D';
    const isStoreTeam = user?.department === 'Store';
    
    this.canApprove = role === 'admin' || isRDTeam || isStoreTeam;
    this.canIssue = role === 'admin' || isStoreTeam;
    this.canDelete = role === 'admin' || isStoreTeam || isRDTeam;
    
    if (this.mrnId) {
      this.loadMrn();
    }
  }

  get canApproveTransferBtn(): boolean {
    if (!this.mrn) return false;
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    const role = user.role?.toLowerCase();
    if (role === 'admin') return true;

    const isRD = user.department === 'R&D';
    if (isRD) return true; // R&D Team can approve

    const designation = (user.designation || '').toLowerCase().trim();
    const isProjectLead = designation === 'project lead';

    if (isProjectLead) {
      const currentUserId = Number(user.id);
      const fromLeadId = this.mrn.FromProject?.project_lead_id ? Number(this.mrn.FromProject.project_lead_id) : null;
      const toLeadId = this.mrn.ToProject?.project_lead_id ? Number(this.mrn.ToProject.project_lead_id) : null;

      // Restrict access strictly to the leads tied to this specific transaction pair
      return currentUserId === fromLeadId || currentUserId === toLeadId;
    }

    return false;
  }

  loadMrn() {
    this.loading = true;
    this.http.get(`http://localhost:3000/api/mrn/${this.mrnId}`).subscribe({
      next: (data) => {
        this.mrn = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load MRN details.';
        this.loading = false;
      }
    });
  }

  toastMessage: string | null = null;
  toastType: 'success' | 'error' | null = null;

  showToast(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    setTimeout(() => {
      this.toastMessage = null;
      this.toastType = null;
    }, 4000);
  }

  approveMrn() {
    const user = this.authService.getCurrentUser();
    this.http.patch(`http://localhost:3000/api/mrn/${this.mrnId}/approve`, {
      approved_by_name: user?.name
    }).subscribe({
      next: () => {
        this.showToast('MRN Approved successfully! Notification sent to Head and Production teams.', 'success');
        this.loadMrn();
      },
      error: (err) => this.showToast(err.error?.message || 'Failed to approve MRN.', 'error')
    });
  }

  deleteMrn() {
    this.http.delete(`http://localhost:3000/api/mrn/${this.mrnId}`).subscribe({
      next: () => {
        this.showToast(`MRN ${this.mrn.mrn_no} deleted successfully.`, 'error');
        setTimeout(() => this.router.navigate(['/admin/mrn']), 2500);
      },
      error: (err) => this.showToast(err.error?.message || 'Failed to delete MRN.', 'error')
    });
  }

  printSlip() {
    window.print();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending':   return 'status-pending';
      case 'Approved':  return 'status-approved';
      case 'Partial':   return 'status-partial';
      case 'Issued':    return 'status-issued';
      case 'Fulfilled': return 'status-fulfilled';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getFulfillmentPercent(item: any): number {
    if (!item.requested_quantity || item.requested_quantity === 0) return 0;
    return Math.min(100, (item.issued_quantity / item.requested_quantity) * 100);
  }
}
