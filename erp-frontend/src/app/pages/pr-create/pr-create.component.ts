import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PurchaseRequestService, PurchaseRequest, PurchaseRequestItem } from '../../services/purchase-request.service';
import { ProjectService } from '../../services/project.service';
import { ItemService, Item } from '../../services/item.service';
import { InventoryService, Stock } from '../../services/inventory.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-pr-create',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './pr-create.component.html',
  styleUrls: ['./pr-create.component.css']
})
export class PrCreateComponent implements OnInit {
  currentUser: any = null;
  projects: any[] = [];
  availableItems: Item[] = [];
  inventoryStocks: { [itemId: number]: number } = {};
  isEditMode = false;
  editId: number | null = null;

  pr: any = {
    pr_no: '',
    request_date: new Date().toISOString().split('T')[0],
    requested_by_id: null,
    project_id: null,
    qc_required: false,
    bom_revision_id: null,
    designation: '',
    department: '',
    remarks: '',
    status: 'Draft'
  };

  bomItems: any[] = [];
  manualItems: any[] = [];
  approvedBoms: any[] = [];

  loading = false;
  submittingDraft = false;
  submittingFinal = false;
  showItemModal = false;
  sessionAddedCount = 0;
  itemSearchQuery = '';
  filteredModalItems: Item[] = [];
  recentlyAddedItems: any[] = [];
  error = '';
  success = '';
  itemSelectedMessage = '';
  totalValue: number = 0;
  selectionToast: string = '';
  selectionToastType: 'success' | 'warning' = 'success';
  private _selectionToastTimer: any = null;

  masterSearchQuery = '';
  filteredMasterItems: Item[] = [];
  selectedWarehouse = 'All Warehouses';
  allStocks: Stock[] = [];
  uniqueWarehouses: string[] = [];

  // Modal Pagination
  modalCurrentPage = 1;
  modalPageSize = 10;

  uomOptions: string[] = ['PCS', 'SET', 'KG', 'MTR', 'PKT', 'BOX', 'LTR', 'NOS', 'ROLL'];

  currentPage = 1;
  itemsPerPage = 10;

  get isLocked(): boolean {
    const isRestricted = this.pr.status === 'Closed' || this.pr.status === 'Approved';
    if (isRestricted) return true;
    
    if (this.currentUser?.role === 'admin') return false;
    
    const hasEditPermission = this.authService.hasPermission('Purchase Request', 'can_edit');
    if (hasEditPermission && this.isOwner) return false;
    
    return true;
  }

  get isReviewMode(): boolean {
    const isRestrictedStatus = this.pr.status === 'Approved' || this.pr.status === 'Closed';
    if (isRestrictedStatus) return true;
    
    if (this.currentUser?.role === 'admin') return false;
    
    const hasEditPermission = this.authService.hasPermission('Purchase Request', 'can_edit');
    if (hasEditPermission && this.isOwner) {
      return this.pr.status !== 'Draft' && !this.forcingEdit;
    }
    
    return true;
  }

  forcingEdit = false;

  get canSeeAllPrs(): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin') return true;
    return this.authService.hasPermission('Purchase Request', 'can_view');
  }

  get isOwner(): boolean {
    if (!this.currentUser || !this.pr) return false;
    return this.pr.requested_by_id === this.currentUser.id;
  }

  get selectedProject() {
    return this.projects.find(p => p.id === this.pr.project_id);
  }

  get selectedBom() {
    return this.approvedBoms.find(b => b.id === this.pr.bom_revision_id);
  }

  get selectedCount(): number {
    return this.bomItems.filter(i => i.selected).length + this.manualItems.filter(i => i.selected).length;
  }

  get sortedBomItems() {
    return [...this.bomItems].sort((a, b) => {
      if (a.selected === b.selected) return 0;
      return a.selected ? -1 : 1;
    });
  }

  get sortedManualItems() {
    return [...this.manualItems].sort((a, b) => {
      if (a.selected === b.selected) return 0;
      return a.selected ? -1 : 1;
    });
  }

  get allCombinedItems() {
    // Combine both lists and sort by selected status first, then by type
    return [...this.bomItems, ...this.manualItems].sort((a, b) => {
      if (a.selected !== b.selected) return a.selected ? -1 : 1;
      // If both same selected status, keep BOM items first
      if (a.is_bom_item !== b.is_bom_item) return a.is_bom_item ? -1 : 1;
      return 0;
    });
  }

  get totalPages(): number {
    return Math.ceil(this.allCombinedItems.length / this.itemsPerPage);
  }

  get paginatedItems() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.allCombinedItems.slice(start, start + this.itemsPerPage);
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

  // Modal Pagination Getters
  get totalModalPages(): number {
    return Math.ceil(this.filteredModalItems.length / this.modalPageSize) || 1;
  }

  get paginatedModalItems() {
    const start = (this.modalCurrentPage - 1) * this.modalPageSize;
    return this.filteredModalItems.slice(start, start + this.modalPageSize);
  }

  constructor(
    private prService: PurchaseRequestService,
    private projectService: ProjectService,
    private itemService: ItemService,
    private inventoryService: InventoryService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  get isAdmin(): boolean {
    return this.currentUser?.role?.toLowerCase() === 'admin';
  }

  get canApprove(): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin') return true;
    return this.authService.hasPermission('Purchase Request', 'can_approve');
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadProjects();
    this.loadAllItems();
    this.loadInventoryStocks();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.editId = Number(idParam);
      this.loadExistingPr(this.editId);
    } else {
      if (this.currentUser) {
        // Auto-fill user details immediately
        this.pr.requested_by_id = this.currentUser.id;
        this.pr.name = this.currentUser.name; // Ensure name is tracked
        this.pr.designation = this.currentUser.designation || 'Staff';
        this.pr.department = this.currentUser.department || 'General';

        const isAdmin = this.currentUser.role?.toLowerCase() === 'admin' || 
                        this.currentUser.designation?.toLowerCase().includes('administrator');
        
        const allowedDepts = ['QUALITY', 'PRODUCTION', 'R&D', 'RD', 'O&M', 'PURCHASE', 'STORES', 'STORE'];
        const userDept = this.currentUser.department?.toUpperCase() || '';

        // If not admin and not in an authorized dept, block creation
        if (!isAdmin && !allowedDepts.includes(userDept)) {
          this.error = `Department "${userDept}" is not authorized to create Purchase Requests. Please contact Admin.`;
          this.loading = true;
          return;
        }

        this.generatePrNumber();
      }
    }
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (data) => this.projects = data,
      error: (err) => this.error = 'Failed to load projects'
    });
  }

  onProjectChange() {
    if (!this.pr.project_id) {
      this.approvedBoms = [];
      this.bomItems = [];
      this.pr.bom_revision_id = null;
      return;
    }

    this.loading = true;
    this.prService.getApprovedBoms(this.pr.project_id).subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          const maxRev = Math.max(...res.map((b: any) => Number(b.revision_no) || 0));
          this.approvedBoms = res.filter((b: any) => (Number(b.revision_no) || 0) === maxRev);
        } else {
          this.approvedBoms = [];
        }
        this.bomItems = [];
        this.pr.bom_revision_id = null;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load approved BOMs for this project';
        this.loading = false;
      }
    });
  }

  loadInventoryStocks() {
    this.inventoryService.getStockLevels().subscribe({
      next: (stocks) => {
        this.allStocks = stocks;
        const standardWarehouses = ['Warehouse', 'KINFRA', 'KSIDC', 'CDAC'];
        const dataLocations = stocks.map(s => s.location).filter(l => !!l) as string[];
        this.uniqueWarehouses = Array.from(new Set([...standardWarehouses, ...dataLocations])).sort();
        this.updateInventoryStocksMap();
      }
    });
  }

  updateInventoryStocksMap() {
    this.inventoryStocks = {};
    this.allStocks.forEach(stk => {
      const matchLoc = this.selectedWarehouse === 'All Warehouses' || stk.location === this.selectedWarehouse;
      if (matchLoc) {
        if (!this.inventoryStocks[stk.item_id]) {
          this.inventoryStocks[stk.item_id] = 0;
        }
        this.inventoryStocks[stk.item_id] += parseFloat(stk.quantity as any || 0);
      }
    });

    // Also update current items stock on manualItems and bomItems so the live stock on the list is updated!
    this.manualItems.forEach(row => {
      if (row.item_id) {
        row.inventory_stock = this.inventoryStocks[row.item_id] || 0;
      }
    });
    this.bomItems.forEach(row => {
      const id = row.item_id || row.id;
      if (id) {
        row.inventory_stock = this.inventoryStocks[id] || 0;
      }
    });
  }

  loadExistingPr(id: number) {
    this.loading = true;
    this.prService.getPurchaseRequest(id).subscribe({
      next: (data: any) => {
        const isRestrictedStatus = data.status === 'Approved' || data.status === 'Closed';
        if (isRestrictedStatus && !this.canSeeAllPrs) {
          this.error = `This PR is ${data.status} and cannot be edited.`;
        }

        this.pr = {
          pr_no: data.pr_no,
          request_date: data.request_date?.split('T')[0],
          requested_by_id: data.requested_by_id,
          project_id: data.project_id || null,
          qc_required: data.qc_required || false,
          bom_revision_id: data.bom_revision_id,
          designation: data.designation || (data.requested_by_id === this.currentUser?.id ? this.currentUser?.designation : ''),
          department: data.department || (data.requested_by_id === this.currentUser?.id ? this.currentUser?.department : ''),
          remarks: data.remarks,
          status: data.status,
          created_at: data.created_at,
          submitted_at: data.submitted_at,
          approved_at: data.approved_at,
          rejected_at: data.rejected_at,
          Requester: data.Requester,
          Project: data.Project
        };

        if (this.pr.project_id) {
          this.prService.getApprovedBoms(this.pr.project_id).subscribe({
            next: (boms) => {
              if (boms && boms.length > 0) {
                const maxRev = Math.max(...boms.map((b: any) => Number(b.revision_no) || 0));
                this.approvedBoms = boms.filter((b: any) => 
                  (Number(b.revision_no) || 0) === maxRev || b.id === this.pr.bom_revision_id
                );
              } else {
                this.approvedBoms = [];
              }
            }
          });
        }

        const existingItems = data.PurchaseRequestItems || [];
        const bomMap = new Map();
        const manualMap = new Map();

        existingItems.forEach((item: any) => {
          const mapped = {
            item_id: item.item_id,
            item_name: item.item_id ? item.Item?.item_name : item.custom_item_name,
            item_code: item.item_id ? item.Item?.item_code : item.custom_item_code,
            category: item.Item?.category || 'General',
            specification: item.Item?.description,
            material: item.Item?.material,
            uom: item.uom || item.Item?.uom,
            quantity: parseFloat(item.quantity || 0),
            unit_price: parseFloat(item.unit_price || 0),
            tax_percent: parseFloat(item.tax_percent || 0),
            total_price: parseFloat(item.total_price || 0),
            inventory_stock: parseFloat(item.Item?.Stock?.quantity || 0),
            line_status: item.line_status || 'Approved',
            links_remarks_contact: item.links_remarks_contact || '',
            selected: true,
            is_bom_item: item.is_bom_item,
            searchQuery: item.item_id ? item.Item?.item_name : item.custom_item_name
          };

          if (item.is_bom_item) {
            const key = Number(mapped.item_id);
            if (!bomMap.has(key)) {
              bomMap.set(key, mapped);
            } else {
              // Safe accumulation if data had duplicates
              bomMap.get(key).quantity += mapped.quantity;
            }
          } else {
            // Use name+code for uniqueness key if no ID, else ID
            const key = mapped.item_id ? `id_${mapped.item_id}` : `name_${mapped.item_code}_${mapped.item_name}`;
            if (!manualMap.has(key)) {
              manualMap.set(key, mapped);
            } else {
              manualMap.get(key).quantity += mapped.quantity;
            }
          }
        });
        
        this.bomItems = Array.from(bomMap.values());
        this.manualItems = Array.from(manualMap.values());

        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load PR: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  generatePrNumber() {
    if (!this.pr.department) return;
    this.prService.getNextPrNumber(this.pr.department).subscribe({
      next: (res) => this.pr.pr_no = res.nextPrNo,
      error: (err) => console.error('Failed to generate PR number', err)
    });
  }

  printSlip() {
    window.print();
  }

  toggleEditMode() {
    if (this.canSeeAllPrs) return; // Prevention
    this.forcingEdit = !this.forcingEdit;
    if (this.forcingEdit) {
      this.success = 'Edit mode enabled for this request.';
      setTimeout(() => this.success = '', 3000);
    }
  }

  loadAllItems() {
    this.itemService.getItems().subscribe({
      next: (data) => this.availableItems = data,
      error: (err) => console.error('Failed to load items', err)
    });
  }

  onWarehouseChange() {
    this.updateInventoryStocksMap();
    this.filterMasterItems();
  }

  filterMasterItems() {
    const q = this.masterSearchQuery.toLowerCase().trim();
    
    // Restore original workflow: quick search bar filters BOM items if present, else falls back to master
    const sourceList = (this.bomItems && this.bomItems.length > 0) ? this.bomItems : this.availableItems;

    let filtered = sourceList;

    // Apply warehouse filter if needed
    if (this.selectedWarehouse !== 'All Warehouses') {
      filtered = filtered.filter(item => {
        const itemId = item.id || item.item_id;
        return this.allStocks.some(stk => Number(stk.item_id) === Number(itemId) && stk.location === this.selectedWarehouse);
      });
    }

    if (!q) {
      this.filteredMasterItems = filtered.slice(0, 10);
      return;
    }

    this.filteredMasterItems = filtered.filter(item => 
      (item.item_code?.toLowerCase().includes(q) || 
      item.item_name?.toLowerCase().includes(q))
    ).slice(0, 10);
  }

  onBomSelectionChange(row: any) {
    if (row.selected) {
      this.showSelectionToast(`✓ "${row.item_name}" included in PR`, 'success');
    }
  }

  addFromSearch(item: any) {
    const resolvedId = item.id || item.item_id;
    const target = this.bomItems.find(i => Number(i.item_id) === Number(resolvedId));
    
    if (target) {
      target.selected = true;
      this.showSelectionToast(`✓ "${item.item_name}" selected from BOM`);
    } else {
      const isDuplicate = this.manualItems.some(i => Number(i.item_id) === Number(resolvedId));
      if (isDuplicate) {
        this.showSelectionToast(`⚠ "${item.item_name}" already in PR`, 'warning');
        this.masterSearchQuery = '';
        this.filteredMasterItems = [];
        return;
      }

      const newItem = {
        item_id: resolvedId,
        item_name: item.item_name,
        item_code: item.item_code,
        category: item.category || 'General',
        specification: item.description,
        material: item.material,
        uom: item.uom,
        quantity: 1,
        unit_price: 0,
        tax_percent: 0,
        total_price: 0,
        inventory_stock: this.inventoryStocks[resolvedId] || 0,
        links_remarks_contact: '',
        selected: true,
        is_bom_item: false,
        searchQuery: item.item_name
      };
      this.manualItems.push(newItem);
      this.showSelectionToast(`✓ "${item.item_name}" added`);
    }

    this.masterSearchQuery = '';
    this.filteredMasterItems = [];
  }

  onBomChange() {
    if (!this.pr.bom_revision_id) {
      this.bomItems = [];
      return;
    }

    this.loading = true;
    this.prService.getBomItems(this.pr.bom_revision_id).subscribe({
      next: (res: any) => {
        const dedupedMap = new Map();
        (res.items || []).forEach((bi: any) => {
          const itemId = Number(bi.item_id);
          const quantity = parseFloat(bi.quantity || 0);
          
          if (dedupedMap.has(itemId)) {
             // Aggregate quantity if db inadvertently duplicate
             dedupedMap.get(itemId).quantity += quantity;
          } else {
             dedupedMap.set(itemId, {
               item_id: bi.item_id,
               item_name: bi.Item?.item_name,
               item_code: bi.Item?.item_code,
               category: bi.Item?.category || 'General',
               specification: bi.Item?.description,
               material: bi.Item?.material,
               uom: bi.Item?.uom,
               quantity: quantity,
               unit_price: 0,
               tax_percent: 0,
               total_price: 0,
               inventory_stock: this.inventoryStocks[bi.item_id] || 0,
               links_remarks_contact: '',
               selected: false,
               is_bom_item: true
             });
          }
        });

        let rawItems = Array.from(dedupedMap.values());

        // Custom Sorting: By Category then alphabetically by Item Name
        rawItems.sort((a: any, b: any) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.item_name.localeCompare(b.item_name);
        });

        this.bomItems = rawItems;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load BOM items';
        this.loading = false;
      }
    });
  }

  isItemAdded(itemId: number | undefined): boolean {
    if (itemId === undefined || itemId === null) return false;
    return [...this.bomItems, ...this.manualItems].some(i => Number(i.item_id) === Number(itemId));
  }

  showSelectionToast(msg: string, type: 'success' | 'warning' = 'success') {
    this.selectionToast = msg;
    this.selectionToastType = type;
    if (this._selectionToastTimer) clearTimeout(this._selectionToastTimer);
    this._selectionToastTimer = setTimeout(() => { this.selectionToast = ''; }, 1000);
  }

  addManualRow() {
    this.openItemModal();
  }

  openItemModal() {
    this.showItemModal = true;
    this.itemSearchQuery = '';
    this.sessionAddedCount = 0;
    // Restore original workflow: modal always shows ALL inventory items
    this.filteredModalItems = this.availableItems.map(item => ({ ...item, tempQuantity: 1 }));
    this.recentlyAddedItems = []; // Clear for new session
  }

  closeItemModal() {
    this.showItemModal = false;
    this.modalCurrentPage = 1;
  }

  filterModalItems() {
    const q = this.itemSearchQuery.toLowerCase().trim();
    const source = this.availableItems.map(item => ({ ...item, tempQuantity: 1 }));
    
    if (!q) {
      this.filteredModalItems = source;
      return;
    }
    this.filteredModalItems = source.filter(item => 
      item.item_code?.toLowerCase().includes(q) || 
      item.item_name?.toLowerCase().includes(q)
    );
    this.modalCurrentPage = 1;
  }

  selectItemFromModal(item: any) {
    // Resolve the item's real ID — id may be optional on the interface
    const resolvedId = item.id ?? item.item_id;

    // 1. Strong duplicate check — compare as Numbers to avoid type mismatch ('123' vs 123)
    const allCurrentItems = [...this.bomItems, ...this.manualItems];
    const isDuplicate = allCurrentItems.some(i => Number(i.item_id) === Number(resolvedId));

    if (isDuplicate) {
      this.showSelectionToast(`⚠ "${item.item_name}" already in PR`, 'warning');
      return;
    }

    // 2. Add to manual items
    const newItem = {
      item_id: resolvedId,
      item_name: item.item_name,
      item_code: item.item_code,
      category: item.category || 'General',
      specification: item.description,
      material: item.material,
      uom: item.uom,
      quantity: Math.floor(item.tempQuantity || 1),
      unit_price: 0,
      tax_percent: 0,
      total_price: 0,
      inventory_stock: this.inventoryStocks[resolvedId] || 0,
      line_status: 'Approved',
      links_remarks_contact: '',
      selected: true,
      is_bom_item: false,
      searchQuery: item.item_name
    };

    this.manualItems.push(newItem);
    this.recentlyAddedItems.unshift(newItem);
    this.sessionAddedCount++;

    // Mini toast inside modal
    this.itemSelectedMessage = `"${item.item_name}" added. (${this.sessionAddedCount} items picked)`;
    setTimeout(() => this.itemSelectedMessage = '', 1200);

    this.showSelectionToast(`✓ ${item.item_name} added to PR`);

    if (this.recentlyAddedItems.length > 5) {
      this.recentlyAddedItems.pop();
    }
  }

  removeManualRow(item: any) {
    const idx = this.manualItems.indexOf(item);
    if (idx !== -1) {
      this.manualItems.splice(idx, 1);
    }
  }

  onUnifiedItemInput(row: any) {
    this.processSelection(row, row.searchQuery);
  }

  onCodeInput(row: any) {
    this.processSelection(row, row.item_code);
  }

  private processSelection(row: any, query: string) {
    if (!query) {
      row.item_id = null;
      return;
    }

    const q = query.toLowerCase();
    
    // Search logic:
    // 1. Always match if it's the exact combined string "CODE | NAME" (Explicit selection)
    // 2. Match if it's the exact Code (Explicit code entry)
    // 3. Match by name
    const match = this.availableItems.find(ai => {
      const combined = (ai.item_code.toLowerCase() + ' | ' + ai.item_name.toLowerCase());
      if (combined === q) return true;
      if (ai.item_code.toLowerCase() === q) return true;
      if (ai.item_name.toLowerCase() === q) return true;
      return false;
    });

    if (match) {
      row.item_id = match.id;
      row.item_name = match.item_name;
      row.searchQuery = match.item_name; // Sync name field
      row.item_code = match.item_code;
      row.uom = match.uom;
      row.inventory_stock = match.id ? (this.inventoryStocks[match.id] || 0) : 0;
    } else {
      // No match found - ensure we keep the item custom
      row.item_id = null;
    }
  }

  calculateTotal(row: any) {
    const qty = Number(row.quantity) || 0;
    const price = Number(row.unit_price) || 0;
    const tax = Number(row.tax_percent) || 0;
    row.total_price = qty * price * (1 + tax / 100);
  }

  toggleSelectAll(event: any) {
    const checked = event.target.checked;
    this.bomItems.forEach(item => item.selected = checked);
  }

  onSubmit(finalSubmit: boolean) {
    // Filter out manual rows that do not have an item selected AND no manual text provided
    this.manualItems = this.manualItems.filter(i => i.item_id !== null || (i.searchQuery && i.searchQuery.trim() !== ''));

    const selectedBomItems = this.bomItems.filter(i => i.selected);
    const allItems = [...selectedBomItems, ...this.manualItems];

    if (allItems.length === 0) {
      this.error = 'No items selected for procurement.';
      return;
    }

    if (allItems.some(i => i.quantity == null || i.quantity <= 0)) {
      this.error = 'Quantity must be greater than zero for all selected items.';
      return;
    }

    // Strict Mandatory field check
    if (!this.pr.pr_no || !this.pr.request_date || !this.pr.designation || !this.pr.department || !this.pr.project_id) {
      this.error = 'Please fill in all mandatory PR details (Project, Department, Designation, etc).';
      return;
    }

    if (finalSubmit) {
      this.submittingFinal = true;
    } else {
      this.submittingDraft = true;
    }

    this.error = '';

    const payload = {
      ...this.pr,
      status: finalSubmit ? 'Submitted' : 'Draft',
      items: allItems.map(i => ({
        item_id: i.item_id,
        item_code: i.item_code,
        quantity: Math.floor(i.quantity), // Ensure integer quantity
        uom: i.uom,
        unit_price: i.unit_price,
        tax_percent: i.tax_percent,
        total_price: i.total_price,
        links_remarks_contact: i.links_remarks_contact,
        is_bom_item: i.is_bom_item,
        line_status: i.line_status,
        custom_item_name: i.item_id ? null : (i.item_name || i.searchQuery)
      }))
    };

    const request$ = this.isEditMode
      ? this.prService.updatePurchaseRequest(this.editId!, payload)
      : this.prService.createPurchaseRequest(payload);

    request$.subscribe({
      next: (res) => {
        // Officially update the UI state to match the DB
        Object.assign(this.pr, res);
        this.success = finalSubmit
          ? 'Purchase Request Submitted successfully! The Store and Purchase teams have been notified.'
          : 'Purchase Request saved as Draft!';
        setTimeout(() => this.router.navigate(['/admin/purchase-requests']), 2500);
      },
      error: (err) => {
        this.error = (this.isEditMode ? 'Failed to update PR: ' : 'Failed to create PR: ') + (err.error?.message || err.message);
        this.submittingDraft = false;
        this.submittingFinal = false;
        // status remains Draft in the UI so they can edit and retry
      }
    });
  }

  toggleLineStatus(row: any) {
    if (this.isLocked || !this.canApprove) return;
    row.line_status = row.line_status === 'Approved' ? 'Rejected' : 'Approved';
  }

  onApprove() {
    if (!this.pr.managerApproved) return;
    if (confirm('Are you sure you want to approve this Purchase Request? This will notify the procurement team.')) {
      this.onStatusChange('Approved');
    }
  }

  onStatusChange(newStatus: string) {
    if (!this.editId) return;
    this.submittingFinal = true;

    const allItems = [...this.bomItems, ...this.manualItems];
    const itemDecisions = allItems.filter(i => i.id).map(i => ({
      id: i.id,
      line_status: i.line_status
    }));

    this.prService.updateStatus(this.editId, newStatus, itemDecisions).subscribe({
      next: (res) => {
        Object.assign(this.pr, res);
        this.success = `Purchase Request successfully ${newStatus}!`;
        this.submittingFinal = false;
        setTimeout(() => this.router.navigate(['/admin/purchase-requests']), 2500);
      },
      error: (err) => {
        this.error = 'Failed to update status: ' + (err.error?.message || err.message);
        this.submittingFinal = false;
      }
    });
  }
}
