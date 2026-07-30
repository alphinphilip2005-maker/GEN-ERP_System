import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { PurchaseRequestService } from '../../services/purchase-request.service';
import { QuoteService, Quote } from '../../services/quote.service';
import { VendorService, Vendor } from '../../services/vendor.service';
import { AuthService } from '../../services/auth.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-quotation-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './quotation-management.component.html',
  styleUrls: ['./quotation-management.component.css']
})
export class QuotationManagementComponent implements OnInit {
  // Navigation State
  view: 'projects' | 'prs' | 'details' = 'projects';
  selectedProject: any = null;
  selectedPr: any = null;
  projectGroups: any[] = [];
  groupedQuotes: any[] = [];
  activeTab: 'pending' | 'history' = 'pending';

  // Pagination
  currentPage = 1;
  itemsPerPage = 9;
  itemPage = 1;      // New: for items inside a PR
  itemsPerPageDetail = 7; // New: 7 items per page for details view

  // Quotes Loading
  quotesLoading = true;
  quotesError = '';
  quoteActionLoading: number | null = null;

  // Add/Import Quote State
  vendors: Vendor[] = [];
  showQuoteModal = false;
  activeItem: any = null;
  itemQuotes: Quote[] = [];
  newQuote: Partial<Quote> = {};
  savingQuote = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  
  fileName = '';
  selectedQuoteFile: File | null = null;
  prSearchQuery = '';
  projectSearchQuery = '';

  // Modal State
  showConfirmModal = false;
  quoteToApprove: any = null;
  quoteToReject: any = null;
  isApprovalAction = true;
  isDeleteAction = false;
  showDuplicateModal = false;
  duplicateErrorMessage = '';
  quoteToDelete: any = null;

  get canCreate(): boolean {
    return this.authService.hasPermission('Quotation Management', 'can_create');
  }

  get canEdit(): boolean {
    return this.authService.hasPermission('Quotation Management', 'can_edit');
  }

  get canDelete(): boolean {
    return this.authService.hasPermission('Quotation Management', 'can_delete');
  }

  get canApprove(): boolean {
    return this.authService.hasPermission('Quotation Management', 'can_approve');
  }

  constructor(
    private prService: PurchaseRequestService,
    private quoteService: QuoteService,
    private vendorService: VendorService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadQuotes();
    this.vendorService.getVendors().subscribe(res => {
      this.vendors = res.filter(v => (v as any).approval_status === 'Approved');
    });
  }

  // ── Data Loading & Grouping ───────────────────────────────────────────────────────────
  loadQuotes() {
    this.quotesLoading = true;
    this.quotesError = '';
    
    this.prService.getPurchaseRequests().subscribe({
      next: (data) => {
        // Broad filter: Show any PR that was approved and is in the procurement cycle
        const procurementPRs = data.filter(pr => 
          ['Approved', 'PO Generated', 'Partial PO', 'Closed'].includes(pr.status)
        );
        this.groupPrsByProject(procurementPRs);
        this.quotesLoading = false;

        // If we were viewing a specific PR, refresh the reference to the new data
        if (this.selectedPr) {
          const updatedPr = this.groupedQuotes.find(g => g.id === this.selectedPr.id);
          if (updatedPr) {
            this.selectedPr = updatedPr;
          } else {
            // PR might have changed status out of the filter range
            this.view = 'prs';
            this.selectedPr = null;
          }
        }
      },
      error: (err) => {
        this.quotesError = 'Failed to load purchase requests: ' + (err.error?.message || err.message);
        this.quotesLoading = false;
      }
    });
  }

  groupPrsByProject(prs: any[]) {
    const projMap: any = {};
    const groups: any = {};

    prs.forEach(pr => {
      const prId = pr.id;
      const projectId = pr.Project?.id || 0;
      const projectName = pr.Project?.project_name || 'General';

      if (!projMap[projectId]) {
        projMap[projectId] = {
          id: projectId,
          name: projectName,
          code: pr.Project?.project_code || 'N/A',
          prCount: 0
        };
      }
      projMap[projectId].prCount++;

      if (!groups[prId]) {
        groups[prId] = {
          id: prId,
          pr_no: pr.pr_no || 'Unknown PR',
          projectId: projectId,
          Project: pr.Project,
          Requester: pr.Requester,
          department: pr.department,
          designation: pr.designation || pr.Requester?.designation,
          request_date: pr.request_date || pr.created_at,
          BomRevision: pr.BomRevision,
          status: pr.status,
          items: []
        };
      }
      
      pr.PurchaseRequestItems?.forEach((item: any) => {
        groups[prId].items.push({
          id: item.id,
          name: item.Item?.item_name || item.custom_item_name || `Item #${item.id}`,
          item_code: item.Item?.item_code || 'NON-LISTED',
          quantity: item.quantity,
          uom: item.uom || item.Item?.uom,
          specification: item.Item?.description || item.links_remarks_contact || 'No specifications provided',
          quotes: item.Quotes || [],
          originalItem: item
        });
      });
    });

    this.projectGroups = Object.values(projMap);
    // Sort groupedQuotes by ID descending (latest first)
    this.groupedQuotes = Object.values(groups).sort((a: any, b: any) => b.id - a.id);
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  selectProject(project: any, switchView = true) {
    this.selectedProject = project;
    this.selectedPr = null;
    this.currentPage = 1; // Reset pagination
    this.projectSearchQuery = ''; // Clear project search
    if (switchView) {
      this.view = 'prs';
    }
  }

  selectPr(group: any) {
    this.selectedPr = group;
    this.view = 'details';
    this.itemPage = 1; // Reset item pagination when opening a PR
    window.scrollTo(0, 0);
  }

  backToProjects() {
    this.view = 'projects';
    this.selectedProject = null;
    this.selectedPr = null;
  }

  backToPrs() {
    this.view = 'prs';
    this.selectedPr = null;
  }

  getPaginatedProjects() {
    let filtered = this.projectGroups;
    if (this.projectSearchQuery) {
      const q = this.projectSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        p.code?.toLowerCase().includes(q)
      );
    }
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  getFilteredPrs() {
    if (!this.selectedProject) return [];
    let filtered = this.groupedQuotes.filter(g => g.projectId === this.selectedProject.id);
    
    if (this.prSearchQuery) {
      const q = this.prSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(g => 
        g.pr_no?.toLowerCase().includes(q) || 
        g.requested_by?.toLowerCase().includes(q)
      );
    }

    const start = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  getTotalFilteredCount() {
    if (this.view === 'projects') {
      if (!this.projectSearchQuery) return this.projectGroups.length;
      const q = this.projectSearchQuery.toLowerCase().trim();
      return this.projectGroups.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        p.code?.toLowerCase().includes(q)
      ).length;
    }
    if (!this.selectedProject) return 0;
    let filtered = this.groupedQuotes.filter(g => g.projectId === this.selectedProject.id);
    if (this.prSearchQuery) {
      const q = this.prSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(g => 
        g.pr_no?.toLowerCase().includes(q) || 
        g.requested_by?.toLowerCase().includes(q)
      );
    }
    return filtered.length;
  }

  get totalPages() {
    return Math.ceil(this.getTotalFilteredCount() / this.itemsPerPage);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo(0, 0);
    }
  }

  onPrSearch() {
    this.currentPage = 1;
  }

  changeItemPage(page: number) {
    if (page >= 1 && page <= this.totalItemPages) {
      this.itemPage = page;
      window.scrollTo(0, 0);
    }
  }

  get totalItemPages() {
    if (!this.selectedPr || !this.selectedPr.items) return 0;
    return Math.ceil(this.selectedPr.items.length / this.itemsPerPageDetail);
  }

  getPaginatedItems() {
    if (!this.selectedPr || !this.selectedPr.items) return [];
    const start = (this.itemPage - 1) * this.itemsPerPageDetail;
    return this.selectedPr.items.slice(start, start + this.itemsPerPageDetail);
  }

  // ── View Helpers ───────────────────────────────────────────────────────────
  isItemApproved(item: any): boolean {
    return item?.quotes?.some((q: any) => q.status === 'Approved') || false;
  }

  getPrQuotationStatus(group: any): 'none' | 'pending' | 'partial' | 'complete' {
    if (!group?.items || group.items.length === 0) return 'none';
    
    const totalItems = group.items.length;
    let itemsWithApproved = 0;
    let itemsWithQuotes = 0;

    group.items.forEach((item: any) => {
      if (item.quotes && item.quotes.length > 0) {
        itemsWithQuotes++;
        if (item.quotes.some((q: any) => q.status === 'Approved')) {
          itemsWithApproved++;
        }
      }
    });

    if (itemsWithApproved === totalItems) return 'complete';
    if (itemsWithApproved > 0) return 'partial';
    if (itemsWithQuotes > 0) return 'pending';
    return 'none';
  }

  // ── Approval Logic ───────────────────────────────────────────────────────────
  approveQuote(quote: any, event?: Event) {
    if(event) event.stopPropagation();
    this.quoteToApprove = quote;
    this.isApprovalAction = true;
    this.isDeleteAction = false;
    this.showConfirmModal = true;
  }

  rejectQuote(quote: any, event?: Event) {
    if(event) event.stopPropagation();
    this.quoteToReject = quote;
    this.isApprovalAction = false;
    this.isDeleteAction = false;
    this.showConfirmModal = true;
  }

  deleteQuote(quote: any, event?: Event) {
    if(event) event.stopPropagation();
    this.quoteToDelete = quote;
    this.isDeleteAction = true;
    this.showConfirmModal = true;
  }

  confirmAction() {
    if (this.isDeleteAction) {
      this.executeDelete();
    } else {
      this.executeApprovalStatusChange();
    }
  }

  private executeDelete() {
    const quote = this.quoteToDelete;
    if (!quote) return;
    
    this.quoteActionLoading = quote.id;
    this.quoteService.deleteQuote(quote.id).subscribe({
      next: () => {
        this.quoteActionLoading = null;
        this.showConfirmModal = false;
        this.quoteToDelete = null;
        this.isDeleteAction = false;
        this.showToast('Quotation deleted successfully.');
        this.loadQuotes();
        // If we are in the modal, refresh it
        if (this.activeItem) {
          this.openQuotes(this.activeItem);
        }
      },
      error: (err) => {
        this.quoteActionLoading = null;
        this.showToast('Failed to delete: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  private executeApprovalStatusChange() {
    const quote = this.isApprovalAction ? this.quoteToApprove : this.quoteToReject;
    const status = this.isApprovalAction ? 'Approved' : 'Rejected';
    
    if (!quote) return;
    
    this.quoteActionLoading = quote.id;
    this.quoteService.updateQuoteStatus(quote.id, status).subscribe({
      next: () => { 
        this.quoteActionLoading = null; 
        this.showConfirmModal = false;
        this.quoteToApprove = null;
        this.quoteToReject = null;
        this.loadQuotes(); 
      },
      error: (err) => { 
        this.quoteActionLoading = null; 
        this.showToast('Failed: ' + (err.error?.message || err.message), 'error'); 
      }
    });
  }

  cancelAction() {
    this.showConfirmModal = false;
    this.quoteToApprove = null;
    this.quoteToReject = null;
    this.quoteToDelete = null;
    this.isDeleteAction = false;
  }

  undoApproval(quote: any, event?: Event) {
    if(event) event.stopPropagation();
    this.quoteActionLoading = quote.id;
    this.quoteService.updateQuoteStatus(quote.id, 'Pending').subscribe({
      next: () => { 
        this.quoteActionLoading = null; 
        this.loadQuotes(); 
      },
      error: (err) => { 
        this.quoteActionLoading = null; 
        this.showToast('Failed to undo: ' + (err.error?.message || err.message), 'error'); 
      }
    });
  }

  viewQuoteFile(url: string, event?: Event) {
    if (event) event.stopPropagation();
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
    window.open(fullUrl, '_blank');
  }

  // ── Record Quotes Logic ──────────────────────────────────────────────────────
  openQuotes(item: any) {
    this.activeItem = item.originalItem || item; // ensure we have item ID
    this.fileName = '';
    
    // Fetch latest quotes for this item specifically for the modal
    this.quoteService.getQuotesByPrItem(this.activeItem.id).subscribe(res => {
      this.itemQuotes = res;
      this.selectedQuoteFile = null;
      this.showQuoteModal = true;
    });
  }

  onQuoteFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedQuoteFile = input.files[0];
    }
  }

  closeQuotesModal() {
    this.showQuoteModal = false;
    this.activeItem = null;
    this.newQuote = {};
    this.selectedQuoteFile = null;
  }

  // setQuoteTab removed as Bulk Import is removed


  showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage = message;
    this.toastType = type;
    setTimeout(() => { this.toastMessage = ''; }, 3500);
  }

  saveQuote() {
    if (!this.newQuote.vendor_id || !this.newQuote.price) {
      this.showToast('Vendor and Price are required.', 'error');
      return;
    }
    
    // Requirement: Amt > 5000 needs a file
    if (this.newQuote.price > 5000 && !this.selectedQuoteFile) {
      this.showToast('Amounts over ₹5,000 require an official quotation upload.', 'error');
      return;
    }

    if (this.savingQuote) return;
    this.savingQuote = true;

    if (this.selectedQuoteFile) {
      // Upload file first
      this.quoteService.uploadQuoteFile(this.selectedQuoteFile).subscribe({
        next: (res) => {
          this.submitQuoteRecord(res.url);
        },
        error: (err) => {
          this.savingQuote = false;
          this.showToast('File upload failed: ' + (err.error?.message || err.message), 'error');
        }
      });
    } else {
      this.submitQuoteRecord();
    }
  }

  private submitQuoteRecord(quoteUrl?: string) {
    const quoteData: Quote = {
      pr_item_id: this.activeItem.id,
      vendor_id: Number(this.newQuote.vendor_id),
      price: Number(this.newQuote.price),
      delivery_time: this.newQuote.delivery_time,
      remarks: this.newQuote.remarks,
      quote_url: quoteUrl
    };

    this.quoteService.addQuote(quoteData).subscribe({
      next: (saved) => {
        this.savingQuote = false;
        this.newQuote = {};
        this.selectedQuoteFile = null;
        this.showToast('Quote saved successfully!');
        this.openQuotes(this.activeItem); // Refresh modal
        this.loadQuotes(); // Refresh background data
      },
      error: (err) => {
        this.savingQuote = false;
        const msg = err.error?.message || err.message;
        if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate')) {
          this.duplicateErrorMessage = msg;
          this.showDuplicateModal = true;
        } else {
          this.showToast(msg, 'error');
        }
      }
    });
  }

  closeDuplicateModal() {
    this.showDuplicateModal = false;
    this.duplicateErrorMessage = '';
  }

  // Bulk import methods removed

}
