import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PurchaseRequestService } from '../../services/purchase-request.service';
import { QuoteService } from '../../services/quote.service';
// Removed PO service import

@Component({
  selector: 'app-manager-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './manager-approvals.component.html',
  styleUrls: ['./manager-approvals.component.css']
})
export class ManagerApprovalsComponent implements OnInit {
  // ── Quote Approvals ───────────────────────────────────────────────────────
  pendingQuotes: any[] = [];
  quotesLoading = true;
  quotesError = '';
  quoteActionLoading: number | null = null;

  // PO Summary
  poCount = 0;

  groupedQuotes: any[] = [];
  expandedPrId: number | null = null;
  activeTab: 'pending' | 'history' = 'pending';
  
  // Navigation State
  view: 'projects' | 'prs' = 'projects';
  selectedProject: any = null;
  projectGroups: any[] = [];

  // Modal State
  showConfirmModal = false;
  quoteToApprove: any = null;
  quoteToReject: any = null;
  isApprovalAction = true;


  constructor(
    private prService: PurchaseRequestService,
    private quoteService: QuoteService
  ) {}

  ngOnInit() {
    this.loadQuotes();
    this.loadPOCount();
  }

  // ── Quote Methods ───────────────────────────────────────────────────────────
  loadQuotes() {
    this.quotesLoading = true;
    this.quotesError = '';
    
    this.quoteService.getAllActiveQuotes().subscribe({
      next: (data) => { 
        this.pendingQuotes = data; 
        this.groupQuotesByPr(data);
        this.quotesLoading = false; 
      },
      error: (err) => {
        this.quotesError = 'Failed to load quotations: ' + (err.error?.message || err.message);
        this.quotesLoading = false;
      }
    });
  }

  groupQuotesByPr(quotes: any[]) {
    const groups: any = {};
    const projMap: any = {};

    quotes.forEach(q => {
      const prId = q.PurchaseRequest?.id || 0;
      const projectId = q.PurchaseRequest?.Project?.id || 0;
      const projectName = q.PurchaseRequest?.Project?.project_name || 'N/A';

      if (!projMap[projectId]) {
        projMap[projectId] = {
          id: projectId,
          name: projectName,
          code: q.PurchaseRequest?.Project?.project_code || 'N/A',
          prCount: new Set()
        };
      }
      projMap[projectId].prCount.add(prId);

      if (!groups[prId]) {
        groups[prId] = {
          id: prId,
          pr_no: q.PurchaseRequest?.pr_no || 'Unknown PR',
          projectId: projectId,
          Project: q.PurchaseRequest?.Project || q.PurchaseRequestItem?.PurchaseRequest?.Project,
          Requester: q.PurchaseRequest?.Requester || q.PurchaseRequestItem?.PurchaseRequest?.Requester,
          department: q.PurchaseRequest?.department || q.PurchaseRequestItem?.PurchaseRequest?.department,
          items: {}
        };
      }
      
      const itemId = q.pr_item_id;
      if (!groups[prId].items[itemId]) {
        groups[prId].items[itemId] = {
          id: itemId,
          name: this.getQuoteItemName(q),
          quotes: []
        };
      }
      groups[prId].items[itemId].quotes.push(q);
    });

    this.projectGroups = Object.values(projMap).map((p: any) => ({
      ...p,
      prCount: p.prCount.size
    }));

    this.groupedQuotes = Object.values(groups).map((g: any) => ({
      ...g,
      items: Object.values(g.items)
    }));

    // If we're in 'prs' view, update the current filtered list
    if (this.selectedProject) {
      this.selectProject(this.selectedProject, false);
    }
  }

  selectProject(project: any, switchView = true) {
    this.selectedProject = project;
    if (switchView) this.view = 'prs';
  }

  backToProjects() {
    this.view = 'projects';
    this.selectedProject = null;
  }

  getFilteredPrs() {
    if (!this.selectedProject) return [];
    return this.groupedQuotes.filter(g => g.projectId === this.selectedProject.id);
  }

  togglePrQuotes(prId: number) {
    this.expandedPrId = this.expandedPrId === prId ? null : prId;
  }

  isItemApproved(item: any): boolean {
    return item.quotes.some((q: any) => q.status === 'Approved');
  }

  approveQuote(quote: any) {
    this.quoteToApprove = quote;
    this.isApprovalAction = true;
    this.showConfirmModal = true;
  }

  rejectQuote(quote: any) {
    this.quoteToReject = quote;
    this.isApprovalAction = false;
    this.showConfirmModal = true;
  }

  confirmAction() {
    const quote = this.isApprovalAction ? this.quoteToApprove : this.quoteToReject;
    const status = this.isApprovalAction ? 'Approved' : 'Rejected';
    
    if (!quote) return;
    
    this.quoteActionLoading = quote.id;
    this.quoteService.updateQuoteStatus(quote.id, status).subscribe({
      next: () => { 
        this.quoteActionLoading = null; 
        this.showConfirmModal = false;
        this.loadQuotes(); 
      },
      error: (err) => { 
        this.quoteActionLoading = null; 
        alert('Failed: ' + (err.error?.message || err.message)); 
      }
    });
  }

  cancelAction() {
    this.showConfirmModal = false;
    this.quoteToApprove = null;
    this.quoteToReject = null;
  }

  undoApproval(quote: any) {
    this.quoteActionLoading = quote.id;
    this.quoteService.updateQuoteStatus(quote.id, 'Pending').subscribe({
      next: () => { 
        this.quoteActionLoading = null; 
        this.loadQuotes(); 
      },
      error: (err) => { 
        this.quoteActionLoading = null; 
        alert('Failed to undo: ' + (err.error?.message || err.message)); 
      }
    });
  }

  loadPOCount() {
    this.poCount = 0; // PO module not integrated
  }

  getQuoteItemName(quote: any): string {
    return quote.PurchaseRequestItem?.Item?.item_name
      || `Item #${quote.pr_item_id}`;
  }
}
