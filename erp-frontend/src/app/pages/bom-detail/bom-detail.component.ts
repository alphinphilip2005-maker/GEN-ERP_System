import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BomService, BomProject, BomItem, BomRevision } from '../../services/bom.service';
import { ItemService, Item } from '../../services/item.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-bom-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './bom-detail.component.html',
  styleUrls: ['./bom-detail.component.css']
})
export class BomDetailComponent implements OnInit {
  projectId!: number;
  project!: BomProject;

  activeTab: 'items' | 'history' = 'items';

  // Add Item Modal states
  showAddItemModal = false;
  availableItems: Item[] = [];
  filteredItems: Item[] = [];
  itemSearchQuery = '';

  // Working array of BOM items
  bomItems: any[] = [];
  originalItemsSnapshot: string = ''; // JSON snapshot to detect changes
  latestStatus: string = ''; // Pending, Approved, Rejected

  // History
  revisions: BomRevision[] = [];

  loading = true;
  error = '';
  success = '';
  submitting = false;

  // Modal attributes
  showRevisionModal = false;
  revisionComment = '';
  showApprovalModal = false;
  revisionPendingApproval: BomRevision | null = null;

  isParsingExcel = false;
  excelValidationSummary: any = null;
  excelMissingItems: any[] = [];

  // Pagination for main BOM items
  bomCurrentPage = 1;
  bomPageSize = 20;

  // Pagination for Master Items (Modal)
  masterCurrentPage = 1;
  masterPageSize = 10;

  // Pagination for Revision History
  historyCurrentPage = 1;
  historyPageSize = 10;

  // RBAC Flags
  canCreate = false;
  canEdit = false;
  canDelete = false;
  canApprove = false;

  constructor(
    private route: ActivatedRoute,
    private bomService: BomService,
    private itemService: ItemService,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    // RBAC Initialization
    this.canCreate = this.authService.hasPermission('BOM', 'can_create');
    this.canEdit = this.authService.hasPermission('BOM', 'can_edit');
    this.canDelete = this.authService.hasPermission('BOM', 'can_delete');
    this.canApprove = this.authService.hasPermission('BOM', 'can_approve');

    // Subscribe to param changes to allow navigation between different BOMs
    this.route.paramMap.subscribe(params => {
      this.projectId = Number(params.get('id'));
      if (this.projectId) {
        this.loadProject();
        this.loadAllItems();
      } else {
        this.error = 'Invalid Project ID';
        this.loading = false;
      }
    });
  }

  loadProject() {
    this.loading = true;
    this.bomService.getBomProject(this.projectId).subscribe({
      next: (data: BomProject) => {
        this.project = data;

        // Map the existing saved items to our working array
        if (data.BomItems) {
          this.bomItems = data.BomItems.map((bi: any) => ({
            item_id: bi.item_id,
            item_code: bi.Item?.item_code,
            item_name: bi.Item?.item_name,
            description: bi.Item?.description,
            uom: bi.Item?.uom,
            material: bi.Item?.material,
            quantity: bi.quantity,
            assembly: bi.assembly || '',
            rate: bi.rate || 0,
            price: bi.price || 0,
            actual_qty: bi.actual_qty || 0,
            vendor_name: bi.vendor_name || '',
            remarks: bi.remarks || ''
          }));
          // Take a snapshot after load to detect future changes
          this.originalItemsSnapshot = JSON.stringify(
            this.bomItems.map((b: any) => ({ item_id: b.item_id, quantity: b.quantity }))
          );
        }

        if (data.BomRevisions) {
          this.revisions = data.BomRevisions;
          this.historyCurrentPage = 1; // Reset history page on load
        }

        // Handle decoupled revision pointers from backend
        const lr = (data as any).latest_revision;
        if (lr) {
          this.latestStatus = lr.status || 'Pending';
        } else {
          this.latestStatus = 'Approved';
        }

        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load project: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  hasPendingRevision(): boolean {
    return this.latestStatus === 'Pending';
  }

  getNextRevisionPreview(): string {
    const baseRevision = this.project?.current_revision || '00';
    const nextRevision = parseInt(baseRevision, 10) + 1;
    return nextRevision.toString().padStart(2, '0');
  }

  getRevisionLabel(rev: BomRevision): string {
    if (!this.project) return rev.revision_no;

    const isWorkingUpdate = rev.revision_no === this.project.current_revision && !rev.is_approved;
    const hasApprovedRevision = this.revisions.some(r => !!r.is_approved || r.status === 'Approved');
    const pendingLabel = hasApprovedRevision ? this.getNextRevisionPreview() : this.project.current_revision;

    if (isWorkingUpdate && rev.status === 'Pending') {
      return `${pendingLabel} (Pending Update)`;
    }

    if (isWorkingUpdate && rev.status === 'Rejected') {
      return `${pendingLabel} (Rejected Update)`;
    }

    return rev.revision_no;
  }

  isCurrentRevisionApproved(): boolean {
    if (!this.project || !this.revisions.length) return false;
    const current = this.revisions.find(r => r.revision_no === this.project.current_revision);
    return !!current?.is_approved;
  }

  toggleCurrentApproval() {
    if (!this.project || !this.revisions.length) return;
    const current = this.revisions.find(r => r.revision_no === this.project.current_revision);
    if (current) {
      this.openApprovalModal(current);
    }
  }

  downloadTemplate() {
    this.bomService.downloadTemplate();
  }

  openApprovalModal(rev: BomRevision) {
    if (!this.canApprove) return;
    if (rev.is_approved || rev.status === 'Approved') {
      this.success = `Revision ${this.getRevisionLabel(rev)} is already approved and cannot be unchecked.`;
      setTimeout(() => this.success = '', 3000);
      return;
    }

    this.error = '';
    this.revisionPendingApproval = rev;
    this.showApprovalModal = true;
  }

  closeApprovalModal() {
    if (this.submitting) return;
    this.showApprovalModal = false;
    this.revisionPendingApproval = null;
  }

  confirmApproval() {
    const rev = this.revisionPendingApproval;
    if (!rev || !this.canApprove) return;

    const newStatus = true;
    const currentUser = this.authService.getCurrentUser();
    const userName = currentUser?.name || 'Unknown';

    this.submitting = true;
    this.error = '';

    this.bomService.approveRevision(rev.id!, newStatus, userName).subscribe({
      next: (res: any) => {
        const approvedRevisionNo = res?.revision?.revision_no || rev.revision_no;
        this.success = `Revision ${approvedRevisionNo} approved successfully.`;
        this.submitting = false;
        this.closeApprovalModal();
        this.loadProject(); // Re-fetch to sync across tabs and header
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error = 'Failed to update approval status: ' + (err.error?.message || err.message);
        this.submitting = false;
      }
    });
  }

  loadAllItems() {
    this.itemService.getItems().subscribe({
      next: (items: any[]) => {
        this.availableItems = items;
      },
      error: (err: any) => console.error('Failed to load items', err)
    });
  }

  // --- Add Item Modal Logic ---
  openAddItemModal() {
    this.itemSearchQuery = '';
    this.filteredItems = this.availableItems; // Show all by default when opened
    this.masterCurrentPage = 1; // Reset to page 1
    this.showAddItemModal = true;
  }

  closeAddItemModal() {
    this.showAddItemModal = false;
  }

  filterSearchItems() {
    if (!this.itemSearchQuery) {
      this.filteredItems = this.availableItems;
      return;
    }

    const q = this.itemSearchQuery.toLowerCase();
    this.filteredItems = this.availableItems.filter((item: Item) =>
      item.item_code.toLowerCase().includes(q) ||
      item.item_name.toLowerCase().includes(q)
    );
    this.masterCurrentPage = 1; // Reset page on filter
  }

  selectItem(item: Item) {
    const exists = this.bomItems.find((b: any) => b.item_id === item.id);
    if (exists) {
      this.error = `Item "${item.item_name}" is already in the BOM.`;
      setTimeout(() => this.error = '', 3000);
    } else {
      this.bomItems.push({
        item_id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description,
        uom: item.uom,
        material: item.material,
        quantity: 1,
        assembly: '',
        rate: 0,
        price: 0,
        actual_qty: 0,
        vendor_name: '',
        remarks: ''
      });
      this.success = `${item.item_name} added to BOM successfully.`;
      setTimeout(() => this.success = '', 3000);
    }
  }

  removeItem(index: number) {
    this.bomItems.splice(index, 1);
  }

  recalculatePrice(item: any) {
    item.price = (item.quantity || 0) * (item.rate || 0);
  }

  hasChanges(): boolean {
    const current = JSON.stringify(
      this.bomItems.map((b: any) => ({ item_id: b.item_id, quantity: b.quantity }))
    );
    return current !== this.originalItemsSnapshot;
  }

  // --- Modal Logic ---

  openRevisionModal() {
    if (!this.hasChanges()) {
      this.success = 'No changes detected. Edit the BOM items before releasing a new revision.';
      setTimeout(() => this.success = '', 3000);
      return;
    }
    this.revisionComment = '';
    this.showRevisionModal = true;
  }

  onExcelUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      this.isParsingExcel = true;
      this.error = '';
      this.success = '';
      this.excelValidationSummary = null;
      this.excelMissingItems = [];

      this.bomService.parseBomExcel(file).subscribe({
        next: (res: any) => {
          this.isParsingExcel = false;
          this.excelValidationSummary = res.summary;
          this.excelMissingItems = res.missingItems;

          if (res.validItems && res.validItems.length > 0) {
            const newValidItems = res.validItems.filter((vi: any) =>
              !this.bomItems.find((ei: any) => ei.item_id === vi.item_id)
            );

            if (newValidItems.length > 0) {
              // Create a brand new array reference for Angular change detection
              this.bomItems = [...this.bomItems, ...newValidItems];
              this.success = this.latestStatus === 'Approved'
                ? `${newValidItems.length} items imported from Excel. Save Draft or Release New Revision to send these changes for approval.`
                : `${newValidItems.length} items successfully imported from Excel.`;
            } else {
              this.success = 'Items from Excel are already present in the BOM.';
            }
          }

          if (res.missingItems && res.missingItems.length > 0) {
            this.error = `${res.missingItems.length} items were not found in Item Master. Check the details below.`;
          }

          // Reset file input
          target.value = '';
        },
        error: (err: any) => {
          this.isParsingExcel = false;
          this.error = 'Failed to parse Excel: ' + (err.error?.message || err.message);
          target.value = '';
        }
      });
    }
  }

  closeRevisionModal() {
    this.showRevisionModal = false;
  }

  saveDraftBOM() {
    this.submitting = true;
    this.error = '';
    this.success = '';

    const currentUser = this.authService.getCurrentUser();
    const userName = currentUser?.name || 'Unknown User';

    const payload = {
      items: this.bomItems.map((b: any) => ({
        item_id: b.item_id,
        quantity: b.quantity,
        assembly: b.assembly,
        rate: b.rate,
        price: b.price,
        actual_qty: b.actual_qty,
        vendor_name: b.vendor_name,
        remarks: b.remarks
      })),
      revised_by: userName,
      is_draft: true
    };

    this.bomService.updateBomProject(this.projectId, payload).subscribe({
      next: (res: any) => {
        this.success = this.latestStatus === 'Approved'
          ? 'Excel and BOM changes saved as a pending draft. They are not approved until someone approves the revision from History.'
          : 'Draft saved successfully.';
        this.submitting = false;

        // Reload project to ensure we are up to date
        this.loadProject();
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error = 'Failed to save Draft: ' + (err.error?.message || err.message);
        this.submitting = false;
      }
    });
  }

  saveBOM() {
    if (!this.revisionComment.trim()) return;

    this.submitting = true;
    this.error = '';
    this.success = '';

    const currentUser = this.authService.getCurrentUser();
    const userName = currentUser?.name || 'Unknown User';

    const payload = {
      items: this.bomItems.map((b: any) => ({
        item_id: b.item_id,
        quantity: b.quantity,
        assembly: b.assembly,
        rate: b.rate,
        price: b.price,
        actual_qty: b.actual_qty,
        vendor_name: b.vendor_name,
        remarks: b.remarks
      })),
      change_description: this.revisionComment,
      revised_by: userName,
      is_draft: false
    };

    this.bomService.updateBomProject(this.projectId, payload).subscribe({
      next: (res: any) => {
        const revisionNo = this.project?.current_revision || res.current_revision || '00';
        this.success = res.is_draft
          ? 'Draft saved successfully.'
          : `Revision ${revisionNo} update submitted for approval. The revision number will change only after approval.`;

        this.closeRevisionModal();
        this.submitting = false;

        // Reload project to sync data
        this.loadProject();
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error = 'Failed to save BOM: ' + (err.error?.message || err.message);
        this.submitting = false;
        this.closeRevisionModal();
      }
    });
  }

  // --- Pagination Getters ---
  get paginatedBomItems() {
    const start = (this.bomCurrentPage - 1) * this.bomPageSize;
    return this.bomItems.slice(start, start + this.bomPageSize);
  }

  get totalBomPages() {
    return Math.ceil(this.bomItems.length / this.bomPageSize) || 1;
  }

  get paginatedMasterItems() {
    const start = (this.masterCurrentPage - 1) * this.masterPageSize;
    return this.filteredItems.slice(start, start + this.masterPageSize);
  }

  get totalMasterPages() {
    return Math.ceil(this.filteredItems.length / this.masterPageSize) || 1;
  }

  get paginatedHistoryItems() {
    const start = (this.historyCurrentPage - 1) * this.historyPageSize;
    return this.revisions.slice(start, start + this.historyPageSize);
  }

  get totalHistoryPages() {
    return Math.ceil(this.revisions.length / this.historyPageSize) || 1;
  }
}
