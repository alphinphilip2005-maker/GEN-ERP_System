import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PurchaseRequestService } from '../../services/purchase-request.service';
import { QuoteService, Quote } from '../../services/quote.service';
// Removed PO service import
import { VendorService, Vendor } from '../../services/vendor.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-pr-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './pr-detail.component.html',
  styleUrls: ['./pr-detail.component.css']
})
export class PrDetailComponent implements OnInit {
  pr: any = null;
  loading = true;
  currentUser: any = null;
  canApprove = false;
  submittingFinal = false;

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;

  get totalPages(): number {
    const items = this.pr?.PurchaseRequestItems || [];
    return Math.ceil(items.length / this.itemsPerPage);
  }

  get paginatedItems() {
    const items = this.pr?.PurchaseRequestItems || [];
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return items.slice(start, start + this.itemsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  getGlobalIndex(indexOnPage: number): number {
    return (this.currentPage - 1) * this.itemsPerPage + indexOnPage;
  }

  // Custom Confirmation Modal
  showConfirmModal = false;
  confirmConfig = {
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'primary' as 'primary' | 'danger',
    action: () => {}
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private prService: PurchaseRequestService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.checkPermissions();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.loadPr(parseInt(id, 10));
    });
  }

  loadPr(id: number) {
    this.loading = true;
    this.prService.getPurchaseRequest(id).subscribe({
      next: (data) => {
        this.pr = data;
        // Initialize local approval flag if not present
        if (this.pr && !this.pr.hasOwnProperty('managerApproved')) {
          this.pr.managerApproved = false;
        }
        this.loading = false;
      },
      error: (err) => { console.error(err); this.loading = false; }
    });
  }

  checkPermissions() {
    if (this.currentUser) {
      this.canApprove = this.currentUser.role === 'admin' || 
                        this.authService.hasPermission('Purchase Request', 'can_approve');
    }
  }

  triggerConfirm(config: { title: string, message: string, confirmText?: string, cancelText?: string, type?: 'primary' | 'danger', action: () => void }) {
    this.confirmConfig = {
      title: config.title,
      message: config.message,
      confirmText: config.confirmText || 'Confirm',
      cancelText: config.cancelText || 'Cancel',
      type: config.type || 'primary',
      action: config.action
    };
    this.showConfirmModal = true;
  }

  executeConfirm() {
    this.showConfirmModal = false;
    this.confirmConfig.action();
  }

  onApprove() {
    if (!this.pr.managerApproved) return;
    
    this.triggerConfirm({
      title: 'Confirm Approval',
      message: 'Are you sure you want to approve this Purchase Request for procurement? This action cannot be undone.',
      confirmText: 'Yes, Approve',
      type: 'primary',
      action: () => {
        this.submittingFinal = true;
        this.prService.updatePurchaseRequestStatus(this.pr.id, 'Approved').subscribe({
          next: () => {
            this.router.navigate(['/admin/purchase-requests']);
          },
          error: (err) => {
            console.error('Approval error:', err);
            this.submittingFinal = false;
          }
        });
      }
    });
  }

  onStatusChange(newStatus: string) {
    this.triggerConfirm({
      title: `Confirm ${newStatus}`,
      message: `Are you sure you want to change the status to ${newStatus}?`,
      confirmText: `Yes, ${newStatus}`,
      type: newStatus === 'Rejected' ? 'danger' : 'primary',
      action: () => {
        this.submittingFinal = true;
        this.prService.updatePurchaseRequestStatus(this.pr.id, newStatus).subscribe({
          next: () => {
            this.loadPr(this.pr.id);
            this.submittingFinal = false;
          },
          error: (err) => {
            console.error('Status update error:', err);
            this.submittingFinal = false;
          }
        });
      }
    });
  }

  generatePOs() {
    alert('Use the PO Management module to generate POs.');
  }
}
