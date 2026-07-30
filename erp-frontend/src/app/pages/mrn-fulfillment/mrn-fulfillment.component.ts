import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MrnService } from '../../services/mrn.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mrn-fulfillment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mrn-fulfillment.component.html',
  styleUrls: ['./mrn-fulfillment.component.css']
})
export class MrnFulfillmentComponent implements OnInit {
  // UI State
  loading = true;
  submitting = false;
  error = '';
  success = '';
  toastMessage: string | null = null;
  toastType: 'success' | 'error' | null = null;

  mrnId: number = 0;
  mrn: any = null;
  itemsToIssue: any[] = [];
  users: any[] = [];
  currentUser: any;

  // Expose Math for template
  Math = Math;

  fulfillmentData: any = {
    store_in_charge_name: '',
    remarks: ''
  };

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;

  get totalPages(): number {
    return Math.ceil(this.itemsToIssue.length / this.itemsPerPage);
  }

  get paginatedItems(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.itemsToIssue.slice(start, start + this.itemsPerPage);
  }

  getGlobalIndex(indexOnPage: number): number {
    return (this.currentPage - 1) * this.itemsPerPage + indexOnPage;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

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
    private mrnService: MrnService,
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.mrnId = Number(this.route.snapshot.paramMap.get('id'));
    this.currentUser = this.authService.getCurrentUser();
    // Pre-fill store in-charge with current user if they are Store dept
    if (this.currentUser?.department === 'Store') {
      this.fulfillmentData.store_in_charge_name = this.currentUser.name;
    }
    this.loadUsers();
    this.loadMrnDetails();
  }

  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (data) => this.users = data
    });
  }

  loadMrnDetails() {
    this.loading = true;
    this.mrnService.getMrn(this.mrnId).subscribe({
      next: (data: any) => {
        this.mrn = data;
        // Pre-fill store-in-charge from MRN if already set
        if (data.store_in_charge_name) this.fulfillmentData.store_in_charge_name = data.store_in_charge_name;
        this.prepareItems();
        this.loading = false;
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Failed to load MRN details.', 'error');
        this.loading = false;
      }
    });
  }

  prepareItems() {
    this.itemsToIssue = (this.mrn.MrnItems || []).map((i: any) => {
      const alreadyIssued = Number(i.issued_quantity) || 0;
      const requested = Number(i.requested_quantity) || 0;
      const balance = Math.max(0, requested - alreadyIssued);
      return {
        ...i,
        item_name: i.Item?.item_name || '—',
        item_code: i.Item?.item_code || '—',
        item_specification: i.specification || i.Item?.description || '—',
        uom: i.uom || 'PCS',
        batch_no: i.batch_no || '—',
        product_id: i.product_id || '—',
        already_issued: alreadyIssued,
        balance_qty: balance,
        issued_quantity: 0  // what will be issued THIS time
      };
    });
  }

  getBalanceClass(item: any): string {
    const remaining = item.balance_qty - item.issued_quantity;
    if (remaining <= 0) return 'bal-zero';
    if (item.issued_quantity > 0) return 'bal-partial';
    return 'bal-positive';
  }

  onSubmit(): void {
    // Only include items where user entered a quantity > 0
    const validItems = this.itemsToIssue.filter(
      item => (Number(item.issued_quantity) || 0) > 0
    );

    if (validItems.length === 0) {
      this.showToast('Please enter a quantity to issue', 'error');
      return;
    }

    // Validate quantities don't exceed balance
    const overIssued = validItems.find(
      item => (Number(item.issued_quantity) || 0) > (item.balance_qty || 0)
    );
    if (overIssued) {
      this.showToast(`Quantity for "${overIssued.item_name}" exceeds balance (max: ${overIssued.balance_qty}).`, 'error');
      return;
    }

    // Removed supervisor validation since it's no longer required
    // Auto-fill Store In-charge if not already set
    if (!this.fulfillmentData.store_in_charge_name && this.currentUser) {
      this.fulfillmentData.store_in_charge_name = this.currentUser.name;
    }

    this.submitting = true;
    const payload = {
      issues: validItems.map(item => ({
        item_id: item.item_id,
        quantity: Number(item.issued_quantity)
      })),
      issued_by_id: this.currentUser?.id,
      store_in_charge_name: this.fulfillmentData.store_in_charge_name,
      remarks: this.fulfillmentData.remarks || 'Issued from Store'
    };

    this.mrnService.issueMaterials(this.mrnId, payload).subscribe({
      next: (res: any) => {
        this.showToast(`Materials ${res.status === 'Issued' ? 'fully' : 'partially'} issued! Redirecting...`, 'success');
        setTimeout(() => this.router.navigate(['/admin/mrn']), 2000);
      },
      error: (err: any) => {
        this.showToast(err.error?.message || 'Failed to issue materials. Please try again.', 'error');
        this.submitting = false;
      }
    });
  }
}
