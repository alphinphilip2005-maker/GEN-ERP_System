import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialRejectionService, MaterialRejection } from '../../services/material-rejection.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-rejection-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rejection-log.component.html',
  styleUrls: ['./rejection-log.component.css']
})
export class RejectionLogComponent implements OnInit {
  rejections: MaterialRejection[] = [];
  searchQuery = '';
  
  showActionModal = false;
  showMediaModal = false;
  selectedRejection: MaterialRejection | null = null;
  
  actionForm = {
    action_taken: '',
    status: 'Opened',
    closing_date: ''
  };

  editingRowId: number | null = null;
  successMessage: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  currentMedia: { images: string[], video: string | null } = { images: [], video: null };

  constructor(private rejectionService: MaterialRejectionService, public authService: AuthService) {}

  ngOnInit(): void {
    this.loadRejections();
  }

  loadRejections() {
    this.rejectionService.getRejections().subscribe({
      next: (data) => {
        this.rejections = data.map(r => ({
          ...r,
          draft_action_taken: r.action_taken || '',
          draft_remarks: r.remarks || '',
          draft_root_cause: r.root_cause || '',
          draft_disposition: r.disposition || '',
          draft_status: r.status || 'Opened'
        }));

        // Auto-select the first "New" row for editing if nothing else is being edited
        if (this.editingRowId === null) {
          const freshRow = this.rejections.find(r => r.status === 'Opened' && !r.action_taken);
          if (freshRow) {
            this.editingRowId = freshRow.id;
          }
        }
      },
      error: (err) => console.error('Failed to load rejections', err)
    });
  }

  get filteredRejections() {
    if (!this.searchQuery) return this.rejections;
    const q = this.searchQuery.toLowerCase();
    return this.rejections.filter(r => 
      r.rejection_no.toLowerCase().includes(q) ||
      r.Item?.item_name?.toLowerCase().includes(q) ||
      r.Vendor?.name?.toLowerCase().includes(q) ||
      r.Grn?.grn_no?.toLowerCase().includes(q)
    );
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRejections.length / this.pageSize);
  }

  get paginatedRejections() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRejections.slice(start, start + this.pageSize);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  onSearch() {
    this.currentPage = 1;
  }

  calculateAging(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  openActionModal(rejection: MaterialRejection) {
    this.selectedRejection = rejection;
    this.actionForm = {
      action_taken: rejection.action_taken || '',
      status: rejection.status || 'OPEN',
      closing_date: rejection.closing_date ? rejection.closing_date.split('T')[0] : ''
    };
    this.showActionModal = true;
  }

  submitAction() {
    if (!this.selectedRejection) return;
    
    this.rejectionService.updateRejection(this.selectedRejection.id, this.actionForm).subscribe({
      next: () => {
        this.showActionModal = false;
        this.loadRejections();
      },
      error: (err) => alert('Failed to update: ' + (err.error?.message || 'Unknown error'))
    });
  }

  openMediaModal(rejection: MaterialRejection) {
    this.selectedRejection = rejection;
    if (rejection.media_urls) {
      try {
        this.currentMedia = JSON.parse(rejection.media_urls);
      } catch (e) {
        this.currentMedia = { images: [], video: null };
      }
    } else {
      this.currentMedia = { images: [], video: null };
    }
    this.showMediaModal = true;
  }

  approve(rejection: MaterialRejection, approved: boolean) {
    const comments = prompt(approved ? 'Enter approval comments:' : 'Enter rejection reason:');
    this.rejectionService.approveRejection(rejection.id, { approved, comments: comments || '' }).subscribe({
      next: () => this.loadRejections(),
      error: (err) => alert('Operation failed')
    });
  }

  hasChanges(r: MaterialRejection): boolean {
    return r.draft_action_taken !== (r.action_taken || '') || 
           r.draft_remarks !== (r.remarks || '') ||
           r.draft_root_cause !== (r.root_cause || '') ||
           r.draft_disposition !== (r.disposition || '') ||
           r.draft_status !== (r.status || 'Opened');
  }

  saveInline(r: MaterialRejection) {
    if (r.draft_status === 'Closed') {
      const missingFields: string[] = [];
      if (!r.draft_disposition || r.draft_disposition.trim() === '') missingFields.push('Disposition');
      if (!r.draft_action_taken || r.draft_action_taken.trim() === '') missingFields.push('Action Taken');
      if (!r.draft_remarks || r.draft_remarks.trim() === '') missingFields.push('Remarks');
      if (!r.draft_root_cause || r.draft_root_cause.trim() === '') missingFields.push('Root Cause');

      if (missingFields.length > 0) {
        alert(`Cannot close this rejection log. The following mandatory fields are missing: ${missingFields.join(', ')}.`);
        return;
      }
    }

    const payload = {
      action_taken: r.draft_action_taken,
      remarks: r.draft_remarks,
      root_cause: r.draft_root_cause,
      disposition: r.draft_disposition,
      status: r.draft_status
    };
    
    this.rejectionService.updateRejection(r.id, payload).subscribe({
      next: (updatedRec) => {
        r.action_taken = r.draft_action_taken;
        r.remarks = r.draft_remarks;
        r.root_cause = r.draft_root_cause;
        r.disposition = r.draft_disposition;
        r.status = r.draft_status || 'Opened';
        if (updatedRec && updatedRec.closing_date) {
           r.closing_date = updatedRec.closing_date;
        } else if (r.status !== 'Closed') {
           r.closing_date = undefined;
        }
        this.editingRowId = null;
        this.showSuccess('Rejection log updated successfully');
      },
      error: (err) => alert('Failed to update: ' + (err.error?.message || 'Unknown error'))
    });
  }

  showSuccess(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = null, 3000);
  }

  cancelInline(r: MaterialRejection) {
    r.draft_action_taken = r.action_taken || '';
    r.draft_remarks = r.remarks || '';
    r.draft_root_cause = r.root_cause || '';
    r.draft_disposition = r.disposition || '';
    r.draft_status = r.status || 'Opened';
    this.editingRowId = null;
  }

  startEditing(r: MaterialRejection) {
    if (!this.canEditMRL) return;
    if (r.status !== 'Closed') {
      this.editingRowId = r.id;
    }
  }

  get canEditMRL(): boolean {
    return this.authService.hasPermission('Material Rejection Log', 'can_edit');
  }

  get canEditDisposition(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.department?.toLowerCase().trim() === 'quality') return true;
    return this.authService.hasPermission('Material Rejection Log', 'can_edit');
  }
}
