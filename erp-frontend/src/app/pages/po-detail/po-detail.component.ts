import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PoService, PurchaseOrder } from '../../services/po.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-po-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './po-detail.component.html',
  styleUrls: ['./po-detail.component.css']
})
export class PoDetailComponent implements OnInit {
  poId!: number;
  po!: PurchaseOrder;
  loading = true;
  error = '';
  updating = false;
  currentUser: any = null;
  selectedWarehouse: string = '';
  pendingReturnableRejections: any[] = [];
  
  editReceptionMode = false;
  receptionStatusSelection = '';

  editReturnMode = false;
  returnStatusSelection = '';

  get canUndo(): boolean {
    const user = this.currentUser || this.authService.getCurrentUser();
    if (!user) return false;
    return user.role === 'admin' || 
           user.designation?.toLowerCase().trim() === 'purchase manager' || 
           user.designation?.toLowerCase().trim() === 'purchase officer';
  }

  isReceived(): boolean {
    if (!this.po?.status) return false;
    const s = this.po.status.toUpperCase();
    // If status is not one of the starting statuses, it means it was marked received
    return s !== 'OPEN' && s !== 'SEND TO VENDOR' && s !== 'GENERATED' && s !== 'APPROVED';
  }

  isPartiallyReceived(): boolean {
    if (!this.po?.status) return false;
    const s = this.po.status.toUpperCase();
    return s === 'PARTIALLY RECEIVED' || s.includes('PARTIAL');
  }

  isFullyReceived(): boolean {
    if (!this.po?.status) return false;
    const s = this.po.status.toUpperCase();
    return s === 'ITEM RECEIVED' || s.includes('RECEIVED') || s.includes('RECIVED') || s === 'CLOSED' || s === 'QC ACCEPTED' || s === 'RETURNED SHIPMENT RECEIVED';
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private poService: PoService,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    // Exclusivity Gate
    const des = (this.currentUser?.designation || '').toLowerCase().trim();
    const hasViewPermission = this.authService.hasPermission('Purchase Order', 'can_view');
    const isAllowed = this.isAdmin() || des === 'purchase manager' || des === 'purchase officer' || hasViewPermission;
    if (!isAllowed) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    this.route.paramMap.subscribe(params => {
      this.poId = Number(params.get('id'));
      this.loadPO();
    });
  }

  loadPO(silent = false): void {
    if (!silent) this.loading = true;
    this.poService.getPurchaseOrder(this.poId).subscribe({
      next: (data: any) => {
        this.po = data;
        if (data.warehouse) {
          this.selectedWarehouse = data.warehouse;
        }
        this.checkReturnableRejections(silent);
        
        // Set selection based on state
        if (this.isFullyReceived()) {
          this.receptionStatusSelection = 'FULLY';
        } else if (this.isPartiallyReceived()) {
          this.receptionStatusSelection = 'PARTIAL';
        } else {
          this.receptionStatusSelection = '';
        }

        // Initialize Return Selection
        setTimeout(() => {
          this.returnStatusSelection = this.isReturnBoxChecked ? 'RECEIVED' : 'PENDING';
        }, 200);
        
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load PO Details';
        this.loading = false;
      }
    });
  }

  getStatusColor(status: string | undefined): string {
    if (!status) return 'badge-grey';
    const s = status.trim().toUpperCase();
    if (s === 'OPEN' || s === 'GENERATED') return 'badge-orange';
    if (s === 'CLOSED' || s === 'QC ACCEPTED') return 'badge-green';
    if (s === 'SEND TO VENDOR') return 'badge-blue';
    if (s === 'ITEM RECEIVED' || s.includes('RECIVED') || s === 'FULLY RECEIVED') return 'badge-cyan';
    if (s === 'PARTIALLY RECEIVED' || s.includes('PARTIAL')) return 'badge-blue';
    if (s === 'PENDING' || s === 'QC REJECTED' || s === 'RETURNED SHIPMENT RECEIVED') return 'badge-red';
    return 'badge-grey';
  }

  markReceived(): void {
    if (confirm('Are you sure you want to mark this shipment as completely received?')) {
      this.updating = true;
      this.poService.markReceived(this.poId).subscribe({
        next: () => {
          this.po.status = 'ITEM RECEIVED';
          this.updating = false;
          this.editReceptionMode = false;
          this.showToast('Shipment marked as fully received!', 'success');
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to update stock received';
          this.updating = false;
        }
      });
    }
  }

  markPartiallyReceived(): void {
    if (confirm('Are you sure you want to mark this shipment as partially received?')) {
      this.updating = true;
      this.http.post(`http://localhost:3000/api/po/${this.poId}/receive-partial`, {}).subscribe({
        next: (res: any) => {
          this.po.status = 'PARTIALLY RECEIVED';
          this.updating = false;
          this.editReceptionMode = false;
          this.showToast('Shipment marked as partially received!', 'success');
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to update stock partially received';
          this.updating = false;
        }
      });
    }
  }

  confirmReception(): void {
    if (!this.receptionStatusSelection) return;
    if (this.receptionStatusSelection === 'FULLY') {
      this.markReceived();
    } else if (this.receptionStatusSelection === 'PARTIAL') {
      this.markPartiallyReceived();
    }
  }

  toggleReceptionEdit(): void {
    this.editReceptionMode = !this.editReceptionMode;
  }

  confirmReturnReception(): void {
    const isCurrentlyChecked = this.isReturnBoxChecked;
    if (this.returnStatusSelection === 'RECEIVED' && !isCurrentlyChecked) {
      this.markReturnReceived(null);
    } else if (this.returnStatusSelection === 'PENDING' && isCurrentlyChecked) {
      this.undoReturnReceived();
    }
  }

  toggleReturnEdit(): void {
    this.editReturnMode = !this.editReturnMode;
  }

  checkReturnableRejections(silent = false): void {
    if (!silent) this.pendingReturnableRejections = [];
    // Fetch rejections specifically for this PO using relative path
    this.http.get<any[]>(`http://localhost:3000/api/po/${this.poId}/rejections`).subscribe({
      next: (rejections) => {
        this.pendingReturnableRejections = rejections.filter(rej => {
          return (rej.disposition || '').toLowerCase().includes('return');
        });
      },
      error: (err) => console.error('Error fetching rejections:', err)
    });
  }

  get hasPendingReturns(): boolean {
    return this.pendingReturnableRejections.some(r => r.status !== 'Closed');
  }

  get hasClosedReturns(): boolean {
    return this.pendingReturnableRejections.some(r => r.status === 'Closed');
  }

  get shouldShowReturnBox(): boolean {
    return this.pendingReturnableRejections.length > 0;
  }

  returnLock: boolean = false;

  get isReturnBoxChecked(): boolean {
    if (this.returnLock) return true;
    if (!this.po?.status) return false;
    const s = this.po.status.toUpperCase();
    return s === 'RETURNED SHIPMENT RECEIVED' || s === 'QC ACCEPTED' || s === 'CLOSED';
  }

  get isReturnBoxDisabled(): boolean {
    return this.isReturnBoxChecked || this.updating;
  }

  markReturnReceived(event?: any): void {
    if (!confirm('Are you sure you want to mark all returned shipments as received? This action cannot be undone.')) {
      if (event && event.target) {
        event.target.checked = false;
      }
      // Revert selection if prompt cancelled
      this.returnStatusSelection = 'PENDING';
      return;
    }
    
    this.updating = true;
    
    // Optimistic Update: Mark as closed and locked immediately before request
    this.returnLock = true;
    this.pendingReturnableRejections.forEach(r => r.status = 'Closed');

    // We call the endpoint to handle the return for all pending items
    this.http.post(`http://localhost:3000/api/po/${this.poId}/receive-return`, {}).subscribe({
      next: () => {
        this.showToast('Return shipment confirmed. Procedure restarted.', 'success');
        this.editReturnMode = false; // Exit edit mode on success
        this.loadPO(true);
        this.updating = false;
      },
      error: (err) => {
        // Revert on error
        this.returnLock = false;
        this.pendingReturnableRejections.forEach(r => r.status = 'Opened');
        
        this.showToast(err.error?.message || 'Failed to confirm return shipment', 'error');
        this.updating = false;
      }
    });
  }

  undoReturnReceived(): void {
    if (!confirm('Are you sure you want to revert the returned shipment received status? This will reopen the associated rejections.')) {
      // Revert selection if prompt cancelled
      this.returnStatusSelection = 'RECEIVED';
      return;
    }

    this.updating = true;
    this.http.post(`http://localhost:3000/api/po/${this.poId}/undo-receive-return`, {}).subscribe({
      next: () => {
        this.returnLock = false;
        this.showToast('Returned shipment received reverted successfully. Rejections reopened.', 'success');
        this.editReturnMode = false; // Exit edit mode on success
        this.loadPO(true);
        this.updating = false;
      },
      error: (err: any) => {
        this.showToast(err.error?.error || err.error?.message || 'Failed to revert returned shipment received status', 'error');
        this.updating = false;
      }
    });
  }

  sendToVendor(): void {
    if (!confirm('Are you sure you want to officially send this PO to the Vendor?')) return;
    this.updating = true;
    this.http.post(`http://localhost:3000/api/po/${this.poId}/send-to-vendor`, {}).subscribe({
      next: (res: any) => {
        this.po.status = 'SEND TO VENDOR';
        this.updating = false;
        
        if (res.emailSent) {
          this.showToast(`PO #${this.po.po_no} sent and emailed to ${this.po.ToVendor?.name} successfully!`, 'success');
        } else {
          this.showToast(`PO Status updated. Note: No email address was found for this vendor.`, 'success');
        }
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Failed to send PO to vendor.', 'error');
        this.updating = false;
      }
    });
  }

  toggleApproval(): void {
    if (!this.isPurchaseManager()) {
      alert('Only a Purchase Manager or Administrator can approve this PO.');
      // Revert checkbox state if it was clicked by an unauthorized user
      this.po.is_approved = !this.po.is_approved;
      return;
    }

    this.updating = true;
    this.http.patch(`http://localhost:3000/api/po/${this.poId}/approve`, {
      is_approved: this.po.is_approved,
      approved_by_id: this.currentUser?.id
    }).subscribe({
      next: (res: any) => {
        this.po.is_approved = res.po.is_approved;
        this.po.approved_by_id = res.po.approved_by_id;
        this.updating = false;
        const msg = this.po.is_approved ? 'Purchase Order Approved!' : 'Approval Revoked.';
        // Optional: show a small toast or alert
      },
      error: (err: any) => {
        this.error = 'Failed to update approval status: ' + (err.error?.error || err.message);
        this.updating = false;
        // Revert UI state on error
        this.po.is_approved = !this.po.is_approved;
      }
    });
  }

  // --- RBAC Helpers ---
  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  canSendToVendor(): boolean {
    return this.isAdmin() || this.currentUser?.department === 'Purchase';
  }

  canReceive(): boolean {
    if (this.isAdmin()) return true;
    if (this.currentUser?.department === 'Store') return true;
    const des = this.currentUser?.designation?.toLowerCase().trim();
    return des === 'purchase manager' || des === 'purchase officer';
  }

  canQC(): boolean {
    return this.isAdmin() || this.currentUser?.department === 'Quality' || this.currentUser?.department === 'QC';
  }

  isPurchaseManager(): boolean {
    return this.isAdmin() || this.currentUser?.department === 'Purchase';
  }

  updateWarehouse(): void {
    if (!this.selectedWarehouse) return;
    this.updating = true;
    this.http.patch(`http://localhost:3000/api/po/${this.poId}/warehouse`, {
      warehouse: this.selectedWarehouse,
      all_warehouses: this.selectedWarehouse
    }).subscribe({
      next: (res: any) => {
        this.po.warehouse = res.po.warehouse;
        this.updating = false;
      },
      error: (err) => {
        this.error = 'Failed to update warehouse: ' + (err.error?.message || err.message);
        this.updating = false;
      }
    });
  }

  getWarehouseAddress(warehouse: string | undefined): string {
    if (!warehouse) return '';
    const w = warehouse.trim().toUpperCase();
    if (w === 'CDAC') {
      return 'Robotics and AI Research Centre 4th Floor, CDAC-Knowledge Resource Centre Building, Technopark Campus, Kazhakkoottam, Kerala 695581';
    }
    if (w === 'KINFRA') {
      return 'Plot No 42 A, Kinfra International Apparel Park, Thumba, Pallithura, Thiruvananthapuram-695586, Kerala';
    }
    if (w === 'KSIDC') {
      return 'Standard Design Factory, 2 Ksidc Investment Zone Pampampallam P.O Kanjikode, Pudussery, Kanjikode, Palakkad-678621, Kerala';
    }
    return warehouse;
  }

  printInvoice(): void {
    window.print();
  }

  getSubTotal(): number {
    if (!this.po?.Items) return 0;
    return this.po.Items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }

  getTax(): number {
    return this.getSubTotal() * 0.12; // Static 12% IGST matching mockups
  }

  getGrandTotal(): number {
    return this.getSubTotal() + this.getTax();
  }
}
