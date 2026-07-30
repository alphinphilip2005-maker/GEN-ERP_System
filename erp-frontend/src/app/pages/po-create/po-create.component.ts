import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { PoService, PurchaseOrder, PurchaseOrderItem } from '../../services/po.service';
import { VendorService, Vendor } from '../../services/vendor.service';
import { UserService, User } from '../../services/user.service';
import { PurchaseRequestService, PurchaseRequest } from '../../services/purchase-request.service';
import { ItemService, Item } from '../../services/item.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-po-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './po-create.component.html',
  styleUrls: ['./po-create.component.css']
})
export class PoCreateComponent implements OnInit {
  po: PurchaseOrder = {
    po_no: '', 
    po_date: new Date().toISOString().split('T')[0],
    sanction_code: '',
    pr_id: null as any,
    project_name: '',
    teams: '',
    pq_no: '',
    to_vendor_id: null as any,
    from_branch: 'Main Branch',
    purchase_manager_id: null as any,
    upload_po: '',
    terms_conditions: ''
  };

  selectedVendorId: number | null = null;
  generatedVendorIds: Set<number> = new Set();
  prNoShort: string = '';
  poCountForPR: number = 0;
  
  isEditMode = false;
  editId: number | null = null;
  selectedWarehouse = '';
  initiallyApproved = false;
  filePreviewUrl: string | null = null;
  initialState: any = null;

  items: PurchaseOrderItem[] = [];
  groupedItems: { vendor_id: number, items: PurchaseOrderItem[] }[] = [];
  vendors: Vendor[] = [];

  users: User[] = [];
  prs: PurchaseRequest[] = [];
  allItems: Item[] = [];

  submitting = false;
  error = '';
  pqList: any[] = [];
  selectedPqNo = '';

  constructor(
    private poService: PoService, 
    private vendorService: VendorService,
    private userService: UserService,
    private prService: PurchaseRequestService,
    private itemService: ItemService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    const hasCreatePerm = this.authService.hasPermission('Purchase Order', 'can_create');
    const hasEditPerm = this.authService.hasPermission('Purchase Order', 'can_edit');
    
    const isAllowedRole = currentUser && (
      currentUser.role === 'admin' || 
      currentUser.designation?.toLowerCase().trim() === 'purchase manager' || 
      currentUser.designation?.toLowerCase().trim() === 'purchase officer' ||
      hasCreatePerm || hasEditPerm
    );
    if (!isAllowedRole) {
      alert('Access Denied: Only Admins, Purchase Managers, and Purchase Officers are allowed to make changes to Purchase Orders.');
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    this.vendorService.getVendors().subscribe(v => this.vendors = v);
    this.userService.getUsers().subscribe(u => this.users = u);
    
    // Fetch POs first to reliably know which PRs have POs
    this.poService.getPurchaseOrders().subscribe(pos => {
      // Fetch Approved PRs
      this.prService.getPurchaseRequests().subscribe(prs => {
        this.prs = prs.filter(p => {
          if (p.status !== 'Approved') return false;
          
          if (this.isEditMode) return true; // Bypass filtering in edit mode so disabled dropdown has options

          // Must have all items quoted (fully quoted)
          const allItemsQuoted = p.PurchaseRequestItems && p.PurchaseRequestItems.length > 0 && 
                                 p.PurchaseRequestItems.every((pi: any) => pi.selected_quote_id != null);
          if (!allItemsQuoted) return false;

          // Find all POs for this PR
          const prPOs = pos.filter(po => po.pr_id === p.id);

          const requiredVendorIds = new Set<string>();
          p.PurchaseRequestItems?.forEach((pi: any) => {
            if (pi.selected_quote_id != null) {
              const quote = pi.Quotes?.find((q: any) => q.id == pi.selected_quote_id);
              if (quote) {
                requiredVendorIds.add(String(quote.vendor_id));
              } else if (pi.vendor_id) {
                requiredVendorIds.add(String(pi.vendor_id));
              }
            }
          });

          if (requiredVendorIds.size === 0) return false;

          // Find all APPROVED/SENT POs for this PR
          const approvedVendorIds = new Set<string>();
          prPOs.forEach(po => {
            if (po.is_approved || po.status === 'SEND TO VENDOR' || po.status === 'CLOSED') {
              if (po.to_vendor_id) approvedVendorIds.add(String(po.to_vendor_id));
            }
          });
          
          // It is fully generated ONLY if every required vendor has an APPROVED PO
          let isFullyGenerated = true;
          for (const vId of requiredVendorIds) {
            if (!approvedVendorIds.has(vId)) {
              isFullyGenerated = false;
              break;
            }
          }

          // ... existing logic to determine fully generated ...
          return !isFullyGenerated;
        });
      });
    });
    
    this.itemService.getItems().subscribe(i => this.allItems = i);

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.editId = +id;
        this.loadPO(this.editId);
      }
    });
  }

  loadPO(id: number) {
    this.poService.getPurchaseOrder(id).subscribe({
      next: (data: any) => {
        this.po = data;
        if (this.po.po_date) {
          this.po.po_date = this.po.po_date.split('T')[0];
        }
        this.selectedVendorId = data.to_vendor_id;
        this.selectedWarehouse = data.warehouse || '';
        this.items = data.Items || [];
        this.groupedItems = [{
           vendor_id: this.selectedVendorId!,
           items: this.items
        }];
        this.generatedVendorIds.clear();
        this.initiallyApproved = !!data.is_approved || data.status === 'SEND TO VENDOR';
        
        // Store initial state for change detection
        this.initialState = {
          warehouse: this.selectedWarehouse,
          terms: data.terms_conditions || '',
          branch: data.from_branch || '',
          upload: data.upload_po || ''
        };
      },
      error: () => this.error = 'Failed to load Purchase Order for editing.'
    });
  }

  // Removed getSelectedPrNo and onPqChange

  getItemName(id: number): string {
    const item = this.allItems.find(i => i.id === id);
    return item ? item.item_name : 'Loading...';
  }

  getVendorName(id: number): string {
    const vendor = this.vendors.find(v => v.id === id);
    return vendor ? vendor.name : 'Unknown Vendor';
  }

  onPRChange() {
    if (this.isEditMode || !this.po.pr_id) return;

    this.prService.getPurchaseRequest(this.po.pr_id).subscribe({
      next: (prDetails: any) => {
        // Sync metadata from associated PR
        this.po.project_name = prDetails.Project?.project_name || '';
        
        // Extract short PR ID (e.g. 019 from 2026 GRI/ADMIN/PR/019)
        const parts = prDetails.pr_no.split('/');
        this.prNoShort = parts[parts.length - 1].replace(/^0+/, '') || parts[parts.length - 1]; 
        
        this.generatedVendorIds.clear();
        this.selectedVendorId = null;
        if (prDetails.PurchaseOrders) {
          prDetails.PurchaseOrders.forEach((po: any) => {
            if (po.to_vendor_id) this.generatedVendorIds.add(Number(po.to_vendor_id));
          });
        }

        if (prDetails.PurchaseRequestItems) {
          // Set pq_no and pq_id from the first accepted quote found
          let pqNoSet = false;
          
          this.items = prDetails.PurchaseRequestItems
            .filter((pi: any) => pi.selected_quote_id != null)
            .map((pi: any) => {
              const quote = pi.Quotes?.find((q: any) => q.id == pi.selected_quote_id);
              if (quote && !pqNoSet) {
                this.po.pq_no = quote.quote_no;
                this.po.pq_id = quote.id;
                pqNoSet = true;
              }
              const vendorId = quote ? quote.vendor_id : null;
              const quotePrice = quote ? Number(quote.price) : (Number(pi.unit_price) || 0);
              const finalQty = Math.max(Number(pi.quantity) || 1, 1);
              
              // Crucial Fix: Prevent inflation! Quote price is treated as absolute total regardless of fallback path.
              const itemTotal = quotePrice; 
              const itemUnitPrice = itemTotal / finalQty;

              return {
                item_id: pi.item_id,
                custom_item_name: pi.custom_item_name,
                quantity: pi.quantity,
                uom: pi.uom || pi.Item?.uom || 'Unit',
                vendor_id: vendorId, // Awarded vendor from Accepted Quote
                unit_price: itemUnitPrice,
                total_price: itemTotal
              };
            });
          
          // Seed generated vendor IDs from backend POs
          prDetails.PurchaseOrders?.forEach((po: any) => {
            this.generatedVendorIds.add(po.to_vendor_id);
          });

          if (this.items.length === 0) {
            this.error = 'This PR has no accepted quotes yet. Please approve quotes in the Approval Hub first.';
            this.groupedItems = [];
          } else {
            this.error = '';
            this.groupItemsByVendor();
          }
        }
      }
    });
  }

  // Compute subtotal for the currently selected vendor group
  get subtotal(): number {
    const items = this.selectedGroup?.items || [];
    return items.reduce((sum, itm) => {
      const val = Number(itm.total_price) || Number(itm.amount) || 0;
      return sum + val;
    }, 0);
  }
  groupItemsByVendor() {
    const groups: { [key: string]: PurchaseOrderItem[] } = {};
    this.items.forEach(item => {
      const vId = (item.vendor_id || 0).toString();
      if (!groups[vId]) groups[vId] = [];
      groups[vId].push(item);
    });
    this.groupedItems = Object.keys(groups).map(vId => ({
      vendor_id: Number(vId),
      items: groups[vId]
    }));
  }

  get availableGroups() {
    return this.groupedItems.filter(g => !this.generatedVendorIds.has(g.vendor_id));
  }

  get selectedGroup() {
    return this.groupedItems.find(g => g.vendor_id === this.selectedVendorId);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      // We can use a simple fetch or add a method to poService
      // For now, let's use a direct fetch to the upload API to ensure it works
      fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (data.filename) {
          this.po.upload_po = data.filename;
          this.filePreviewUrl = data.url;
          console.log('File uploaded successfully:', data.filename);
          
          // Instantly save to DB if in edit mode
          if (this.isEditMode && this.editId) {
            this.poService.updateDocument(this.editId, data.filename).subscribe({
              next: () => console.log('Document linked to PO in database.'),
              error: (err) => console.error('Failed to link document to PO', err)
            });
          }
        }
      })
      .catch(err => {
        console.error('File upload failed:', err);
        this.error = 'Failed to upload additional document.';
      });
    }
  }

  viewDocument() {
    if (this.filePreviewUrl) {
      window.open(this.filePreviewUrl, '_blank');
    } else if (this.po.upload_po) {
      const url = this.po.upload_po.startsWith('http') ? this.po.upload_po : 'http://localhost:3000/uploads/' + this.po.upload_po;
      window.open(url, '_blank');
    }
  }

  onSubmit(): void {
    if (!this.po.project_name || !this.selectedVendorId) {
      this.error = 'Please fill out all required fields and select a vendor.';
      return;
    }
    
    this.submitting = true;
    
    // Construct the custom PO number based on stable vendor index
    const vendorIndex = this.groupedItems.findIndex(g => g.vendor_id === this.selectedVendorId);
    this.poCountForPR = vendorIndex + 1;

    const currentYear = new Date().getFullYear();
    const paddedPrNo = this.prNoShort.padStart(2, '0');
    
    if (this.groupedItems.length === 1) {
      this.po.po_no = `${currentYear}-GRI/PO/${paddedPrNo}`;
    } else {
      this.po.po_no = `${currentYear}-GRI/PO/${paddedPrNo}-${this.poCountForPR}`;
    }
    
    this.po.to_vendor_id = this.selectedVendorId;
    this.po.warehouse = this.selectedWarehouse;

    const itemsToSubmit = this.selectedGroup?.items || [];

    this.poService.createPurchaseOrder(this.po, itemsToSubmit).subscribe({
      next: () => {
        alert(`Purchase Order ${this.po.po_no} generated successfully for ${this.getVendorName(this.selectedVendorId!)}.`);
        
        this.generatedVendorIds.add(this.selectedVendorId!);
        this.selectedVendorId = null;
        this.selectedWarehouse = '';
        this.submitting = false;

        if (this.availableGroups.length === 0) {
          alert('All Purchase Orders for this PR have been generated.');
          this.router.navigate(['/admin/po']);
        }
      },
      error: (err) => {
        this.submitting = false;
        this.poCountForPR--; // Rollback count on error
        this.error = err.error?.error || err.error?.message || 'Error occurred while creating PO.';
      }
    });
  }

  getCurrentUserId(): number {
    const u = localStorage.getItem('erp_user');
    if (u) return JSON.parse(u).id;
    return 1;
  }

  getPurchaseManagerName(): string {
    return this.getApproverDetails();
  }

  getApproverDetails(): string {
    const approverId = this.po.approved_by_id || this.po.purchase_manager_id;
    if (!approverId) return 'Pending Manager Approval';
    const user = this.users.find(u => u.id === approverId);
    if (user) {
      return `${user.name} - ${user.designation || 'Purchase Manager'}`;
    }
    return 'Admin';
  }

  getCurrentUserRole(): string {
    return this.authService.getCurrentUser()?.role || 'user';
  }

  getCurrentUserDesignation(): string {
    return this.authService.getCurrentUser()?.designation || '';
  }

  canApprovePO(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    return user.role === 'admin' || user.designation?.toLowerCase().includes('manager');
  }

  isPurchaseOfficer(): boolean {
    const designation = this.getCurrentUserDesignation().toLowerCase();
    return designation.includes('officer') || designation.includes('purchase officer');
  }

  hasChanges(): boolean {
    if (!this.initialState) return true; // Default to true if not loaded
    
    return (
      this.selectedWarehouse !== this.initialState.warehouse ||
      (this.po.terms_conditions || '') !== this.initialState.terms ||
      (this.po.from_branch || '') !== this.initialState.branch ||
      (this.po.upload_po || '') !== this.initialState.upload
    );
  }

  submitForReview(): void {
    if (!this.selectedWarehouse) {
      alert('Please select a Target Warehouse before confirming.');
      this.error = 'Warehouse selection is required.';
      return;
    }
    
    if (!this.editId) return;
    
    this.submitting = true;
    // Update warehouse and set status to 'Pending Approval' or similar if needed
    // For now, we just save the warehouse. The backend doesn't have a 'review' status yet, 
    // but we can update the PO with the warehouse.
    this.poService.updateWarehouse(this.editId, this.selectedWarehouse).subscribe({
      next: () => {
        alert('Purchase Order details updated and submitted for Manager review.');
        this.submitting = false;
        this.router.navigate(['/admin/po']);
      },
      error: (err) => {
        this.error = 'Failed to submit for review.';
        this.submitting = false;
      }
    });
  }

  submitAndSendToVendor() {
    if (!this.selectedWarehouse) {
      alert('Please select a Target Warehouse before approving and sending to the vendor.');
      this.error = 'Warehouse selection is required.';
      return;
    }

    if (!this.editId) return;
    this.submitting = true;

    // 1. Update warehouse
    this.poService.updateWarehouse(this.editId, this.selectedWarehouse).subscribe();

    // 2. Approve
    this.poService.approvePO(this.editId, !!this.po.is_approved, this.getCurrentUserId()).subscribe({
      next: () => {
        // 3. Send to Vendor
        this.poService.sendToVendor(this.editId!).subscribe({
          next: () => {
            alert(`Purchase Order ${this.po.po_no} Approved & Sent to Vendor successfully!`);
            this.submitting = false;
            this.initiallyApproved = true;
            this.po.status = 'SEND TO VENDOR';
            this.router.navigate(['/admin/po']);
          },
          error: (err) => {
            this.error = err.error?.error || 'Failed to send PO to vendor.';
            this.submitting = false;
          }
        });
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to approve PO.';
        this.submitting = false;
      }
    });
  }
}
