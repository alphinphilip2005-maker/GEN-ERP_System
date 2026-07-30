import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MrnService } from '../../services/mrn.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mrn-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './mrn-list.component.html',
  styleUrls: ['./mrn-list.component.css']
})
export class MrnListComponent implements OnInit {
  mrns: any[] = [];
  loading = true;
  search = '';
  typeFilter = '';
  page = 1;
  limit = 9;
  totalPages = 0;
  totalEntries = 0;

  currentUser: any;

  constructor(
    private mrnService: MrnService,
    private authService: AuthService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadMrns();
  }

  goBack() {
    this.router.navigate(['/admin/dashboard']);
  }

  loadMrns() {
    this.loading = true;
    this.mrnService.getMrns(this.page, this.limit, this.search, this.typeFilter).subscribe({
      next: (res) => {
        this.mrns = res.data;
        this.totalEntries = res.total;
        this.totalPages = res.pages;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading MRNs:', err);
        this.loading = false;
      }
    });
  }

  onSearch() { this.page = 1; this.loadMrns(); }
  onTypeFilter() { this.page = 1; this.loadMrns(); }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadMrns();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.loadMrns();
    }
  }

  canApprove(): boolean {
    const role = this.currentUser?.role?.toLowerCase();
    const name = this.currentUser?.name?.toLowerCase() || '';
    return this.currentUser?.designation === 'Store In-charge' || role === 'admin' || name.includes('john');
  }

  canCreate(): boolean {
    const role = this.currentUser?.role?.toLowerCase();
    const dept = this.currentUser?.department;
    const designation = this.currentUser?.designation?.toLowerCase().trim();
    
    const isRDOrProd = dept === 'R&D' || dept === 'Production';
    const isLead = designation === 'project lead';
    
    return isRDOrProd || isLead || role === 'admin';
  }

  canDelete(): boolean {
    const role = this.currentUser?.role?.toLowerCase();
    const name = this.currentUser?.name?.toLowerCase() || '';
    return this.currentUser?.designation === 'Store In-charge' || role === 'admin' || name.includes('john');
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

  approveMrn(id: number) {
    this.mrnService.approveMrn(id).subscribe({
      next: () => {
        this.showToast('MRN Approved successfully! Notification sent to Head and Production teams.', 'success');
        this.loadMrns();
      },
      error: (err) => this.showToast(err.error?.message || 'Failed to approve MRN.', 'error')
    });
  }

  deleteMrn(id: number) {
    this.mrnService.deleteMrn(id).subscribe({
      next: () => {
        this.showToast('MRN deleted successfully.', 'error');
        this.loadMrns();
      },
      error: (err) => this.showToast(err.error?.message || 'Failed to delete MRN.', 'error')
    });
  }

  navigateToCreate() {
    this.router.navigate(['/admin/mrn/create']);
  }
}
