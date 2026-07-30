import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MrnService } from '../../services/mrn.service';
import { ProjectService } from '../../services/project.service';
import { BomService } from '../../services/bom.service';
import { ItemService } from '../../services/item.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mrn-create',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './mrn-create.component.html',
  styleUrls: ['./mrn-create.component.css']
})
export class MrnCreateComponent implements OnInit {
  protected readonly Math = Math;
  mrn: any = {
    slip_no: '',
    request_date: new Date().toISOString().split('T')[0],
    project_id: null,
    department: '',
    category: '',
    remarks: '',
    supervisor_name: '',
    store_in_charge_name: '',
    status: 'Pending'
  };

  projects: any[] = [];
  approvedBoms: any[] = [];
  stagedItems: any[] = [];
  requisitionType: 'Project_Transfer' | 'Store' = 'Store';
  selectedStore: string = '';
  warehouses: string[] = ['Warehouse', 'KINFRA', 'KSIDC', 'CDAC'];

  // Project Transfer fields
  fromProjectId: number | null = null;
  toProjectId: number | null = null;
  transferItems: any[] = [];     // auto-fetched items from source project
  loadingTransfer: boolean = false;
  transferProjectInfo: any = null;
  toStoreLocation: string = ''; // Explicit state for Destination Facility
  
  loading: boolean = false;
  submitting: boolean = false;
  // Modal state
  showBrowseModal = false;
  items: any[] = [];
  filteredItems: any[] = [];
  modalSearch = '';
  modalPage = 1;
  modalLimit = 10;
  modalTotal = 0;
  selectedInModal: Set<number> = new Set();
 
  // Staged Items pagination & search
  stagedSearch: string = '';
  stagedPage: number = 1;
  stagedLimit: number = 5;


  constructor(
    private mrnService: MrnService,
    private projectService: ProjectService,
    private bomService: BomService,
    private itemService: ItemService,
    private authService: AuthService,
    private router: Router
  ) {}

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

  ngOnInit() {

    const user = this.authService.getCurrentUser();
    this.mrn.department = user?.department || '';
    
    this.projectService.getProjects().subscribe(res => this.projects = res);
    this.loadBoms();
    this.loadNextMrnNumber();
  }

  loadNextMrnNumber() {
    this.mrnService.getNextMrnNumber().subscribe(res => {
      this.mrn.slip_no = res.nextNo;
    });
  }

  onProjectChange() {
    this.stagedItems = [];
    this.stagedPage = 1;
    this.loadBoms();
  }

  onRequisitionTypeChange() {
    this.mrn.project_id = null;
    this.selectedStore = '';
    this.toStoreLocation = '';
    this.fromProjectId = null;
    this.toProjectId = null;
    this.transferItems = [];
    this.approvedBoms = [];
    this.stagedItems = [];
    this.stagedPage = 1;
  }

  onFromStoreChange() {
    // Dynamic reactive hook: Reload grid instantly when from-store toggles!
    this.loadTransferItems();
  }

  onFromProjectChange() {
    this.transferItems = [];
    this.stagedItems = [];
    this.loadTransferItems();
  }

  loadTransferItems() {
    if (!this.fromProjectId) return;
    this.loadingTransfer = true;
    // PASS selectedStore as the second arg to filter stock accurate to the location!
    const effLoc = this.selectedStore === 'Warehouse' ? '' : this.selectedStore;
    this.mrnService.getProjectItems(this.fromProjectId, effLoc).subscribe({
      next: (res: any) => {
        this.transferProjectInfo = res.project;
        this.transferItems = (res.items || []).map((item: any) => ({
          ...item,
          requested_quantity: '',
          selected: true
        }));
        this.loadingTransfer = false;
      },
      error: () => { this.loadingTransfer = false; }
    });
  }

  isAllTransferSelected(): boolean {
    return this.transferItems.length > 0 && this.transferItems.every(i => i.selected);
  }

  toggleAllTransfer(event: any) {
    const checked = event.target.checked;
    this.transferItems.forEach(i => i.selected = checked);
  }

  loadBoms() {
    if (!this.mrn.project_id) {
      this.approvedBoms = [];
      return;
    }
    this.projectService.getApi(`purchase-requests/approved-boms/${this.mrn.project_id}`).subscribe({
      next: (d: any) => {
        // Keep only the single latest revision (highest revision_no) per BomProject
        const latestMap = new Map<number, any>();
        (d as any[]).forEach((bom: any) => {
          const key = bom.bom_project_id;
          const existing = latestMap.get(key);
          if (!existing || bom.revision_no > existing.revision_no) {
            latestMap.set(key, bom);
          }
        });
        this.approvedBoms = Array.from(latestMap.values());
      },
      error: (err: any) => {
        console.error('Failed to load BOMs:', err);
        this.approvedBoms = [];
      }
    });
  }

  importBom(revisionId: any) {
    if (!revisionId) return;
    this.loading = true;
    
    // Intelligently derive parameters for precision filtering!
    const project = this.projects.find(p => p.id == this.mrn.project_id);
    const projName = project ? project.project_name : '';
    
    let url = `purchase-requests/bom-items/${revisionId}?`;
    const effLoc = this.selectedStore === 'Warehouse' ? '' : this.selectedStore;
    if (effLoc) url += `location=${encodeURIComponent(effLoc)}&`;

    this.projectService.getApi(url).subscribe({
      next: (res: any) => {
        const incoming = res.items || [];
        const existing = new Set(this.stagedItems.map(s => s.item_id));
        
        const uniqueMap = new Map();
        incoming.forEach((bi: any) => {
          if (!bi.item_id || existing.has(bi.item_id)) return;
          if (!uniqueMap.has(bi.item_id)) {
            uniqueMap.set(bi.item_id, {
              item_id: bi.item_id,
              item_name: bi.Item?.item_name,
              item_code: bi.Item?.item_code,
              specification: bi.Item?.description,
              requested_quantity: '',
              uom: bi.Item?.Uom?.name || 'PCS',
              available_stock: Math.max(0, bi.current_stock || 0),
              is_bom_item: true,
              product_id: this.getSelectedProjectCode(),
              selected: false
            });
          }
        });

        const items = Array.from(uniqueMap.values());
        this.stagedItems = [...this.stagedItems, ...items];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  openBrowseModal() {
    this.showBrowseModal = true;
    this.loadItems();
  }

  loadItems() {
    // Lift project restriction so user can see ANY item that has stock in this facility!
    const effLoc = this.selectedStore === 'Warehouse' ? '' : this.selectedStore;
    this.itemService.getItems(effLoc).subscribe(res => {
      this.items = res;
      this.applyFilter();
    });
  }

  applyFilter() {
    const search = this.modalSearch.toLowerCase();
    this.filteredItems = this.items.filter(i => {
      const matchesSearch = i.item_code.toLowerCase().includes(search) || 
                            i.item_name.toLowerCase().includes(search);
      const hasStock = (i.Stock?.quantity || 0) > 0;
      return matchesSearch && hasStock;
    });
    this.modalPage = 1;
    this.modalTotal = this.filteredItems.length;
    this.updateModalPagination();
  }

  updateModalPagination() {
    // Client-side pagination for the modal
    const start = (this.modalPage - 1) * this.modalLimit;
    const end = start + this.modalLimit;
    // Note: We use a separate array for the displayed items in modal
  }

  get displayedModalItems() {
    const start = (this.modalPage - 1) * this.modalLimit;
    return this.filteredItems.slice(start, start + this.modalLimit);
  }

  toggleSelection(id: number) {
    if (this.selectedInModal.has(id)) {
      this.selectedInModal.delete(id);
    } else {
      this.selectedInModal.add(id);
    }
  }

  isAllSelected() {
    return this.displayedModalItems.every(i => this.selectedInModal.has(i.id));
  }

  toggleAll(event: any) {
    if (event.target.checked) {
      this.displayedModalItems.forEach(i => this.selectedInModal.add(i.id));
    } else {
      this.displayedModalItems.forEach(i => this.selectedInModal.delete(i.id));
    }
  }

  addSelectedItems() {
    this.selectedInModal.forEach(id => {
      const item = this.items.find(i => i.id === id);
      if (item && !this.stagedItems.find(si => si.item_id === id)) {
        this.stagedItems.push({
          item_id: item.id,
          item_code: item.item_code,
          item_name: item.item_name,
          uom: item.uom,
          requested_quantity: '', // blank initially
          specification: '',
          stock: Math.max(0, item.Stock?.quantity || 0), // clamp negative stock to 0
          product_id: this.getSelectedProjectCode(),
          selected: false
        });
      }
    });
    this.showBrowseModal = false;
    this.selectedInModal.clear();
  }

  isAllStagedSelected(): boolean {
    return this.stagedItems.length > 0 && this.stagedItems.every(i => i.selected);
  }

  toggleAllStaged(event: any) {
    const checked = event.target.checked;
    this.stagedItems.forEach(i => i.selected = checked);
  }

  get selectedCount() {
    return this.stagedItems.filter(i => i.selected).length;
  }

  get filteredStagedItems() {
    const search = this.stagedSearch.toLowerCase();
    return this.stagedItems.filter(i => {
      const matchesSearch = i.item_name?.toLowerCase().includes(search) || i.item_code?.toLowerCase().includes(search);
      const hasStock = (parseFloat(i.available_stock) > 0) || (parseFloat(i.stock) > 0);
      return matchesSearch && hasStock;
    });
  }

  get displayedStagedItems() {
    const start = (this.stagedPage - 1) * this.stagedLimit;
    return this.filteredStagedItems.slice(start, start + this.stagedLimit);
  }

  get totalStagedPages() {
    return Math.ceil(this.filteredStagedItems.length / this.stagedLimit);
  }

  removeItem(item: any) {
    const index = this.stagedItems.indexOf(item);
    if (index > -1) {
      this.stagedItems.splice(index, 1);
    }
    // Adjust page if necessary
    if (this.stagedPage > this.totalStagedPages && this.stagedPage > 1) {
      this.stagedPage--;
    }
  }


  onQuantityChange(item: any) {
    const stock = item.available_stock !== undefined ? item.available_stock : (item.stock || 0);
    if (Number(item.requested_quantity) > stock) {
      this.showToast(`Requested quantity for ${item.item_name} exceeds available stock (${stock}).`, 'error');
    }
  }

  onGeneralStoreChange() {
    // Refresh stock to accurately reflect TOTAL warehouse quantities across all projects on this site!
    this.loading = true;
    
    // Use global item service constrained by Location only!
    const effLoc = this.selectedStore === 'Warehouse' ? '' : this.selectedStore;
    this.itemService.getItems(effLoc).subscribe({
      next: (res: any) => {
        const freshItems = res || []; // itemService.getItems returns direct array of items populated with synthetic .Stock
        
        // Create high-speed numeric map tracking accurate warehouse totals per item
        const stockMap = new Map<number, number>();
        freshItems.forEach((si: any) => {
          stockMap.set(si.id, parseFloat(si.Stock?.quantity) || 0);
        });

        // Ripple new warehouse tallies directly into current staging viewport
        this.stagedItems.forEach(stage => {
          const freshQty = stockMap.get(stage.item_id) || 0;
          
          if (stage.available_stock !== undefined) stage.available_stock = freshQty;
          if (stage.stock !== undefined) stage.stock = freshQty;
        });

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  submitMRN() {
    const isTransfer = this.requisitionType === 'Project_Transfer';

    if (isTransfer) {
      // ── Project Transfer validation ──
      if (!this.fromProjectId || !this.toProjectId) {
        this.showToast('Please select both FROM and TO projects.', 'error'); return;
      }
      if (this.fromProjectId === this.toProjectId) {
        this.showToast('FROM and TO projects must be different.', 'error'); return;
      }
      if (!this.selectedStore) {
        this.showToast('Please select a Source Store.', 'error'); return;
      }
      if (!this.toStoreLocation) {
        this.showToast('Please select a Destination Store.', 'error'); return;
      }
      const validItems = this.transferItems.filter(i => i.selected && Number(i.requested_quantity) > 0);
      if (validItems.length === 0) {
        this.showToast('Please enter quantity for at least one item.', 'error'); return;
      }
      for (const item of validItems) {
        if (Number(item.requested_quantity) > item.available_stock) {
          this.showToast(`Requested quantity for "${item.item_name}" exceeds available stock (${item.available_stock}).`, 'error'); return;
        }
      }
      this.submitting = true;
      const payload = {
        ...this.mrn,
        mrn_type: 'Project_Transfer',
        from_project_id: this.fromProjectId,
        to_project_id: this.toProjectId,
        project_id: this.toProjectId,
        store_location: this.selectedStore,
        to_store_location: this.toStoreLocation,
        requested_by_id: this.authService.getCurrentUser()?.id,
        items: validItems
      };
      this.mrnService.createMrn(payload).subscribe({
        next: () => { this.showToast('Transfer MRN created! Awaiting source project approval.', 'success'); setTimeout(() => this.router.navigate(['/admin/mrn']), 2000); },
        error: (err: any) => { this.showToast('Error: ' + (err.error?.message || err.message), 'error'); this.submitting = false; }
      });
    } else {
      // ── Store MRN validation (original) ──
      const selectedItems = this.stagedItems.filter(i => i.selected === true);
      if (selectedItems.length === 0) { this.showToast('Select items first.', 'error'); return; }
      for (const item of selectedItems) {
        const stock = item.available_stock !== undefined ? item.available_stock : (item.stock || 0);
        if (!item.requested_quantity || Number(item.requested_quantity) <= 0) {
          this.showToast(`Please enter a valid quantity for ${item.item_name}.`, 'error'); return;
        }
        if (stock <= 0) { this.showToast(`${item.item_name} is out of stock.`, 'error'); return; }
        if (Number(item.requested_quantity) > stock) {
          this.showToast(`Requested quantity for ${item.item_name} exceeds stock (${stock}).`, 'error'); return;
        }
      }
      this.submitting = true;
      const payload = {
        ...this.mrn,
        mrn_type: 'Store',
        store_location: this.selectedStore,
        requested_by_id: this.authService.getCurrentUser()?.id,
        items: selectedItems
      };
      this.mrnService.createMrn(payload).subscribe({
        next: () => { this.showToast('MRN created successfully', 'success'); setTimeout(() => this.router.navigate(['/admin/mrn']), 2000); },
        error: (err: any) => { this.showToast('Error: ' + (err.error?.message || err.message), 'error'); this.submitting = false; }
      });
    }
  }

  backToList() {
    this.router.navigate(['/admin/mrn']);
  }

  getSelectedProjectCode(): string {
    if (!this.mrn.project_id) return '';
    const project = this.projects.find(p => p.id == this.mrn.project_id);
    return project ? project.project_code : '';
  }
}
