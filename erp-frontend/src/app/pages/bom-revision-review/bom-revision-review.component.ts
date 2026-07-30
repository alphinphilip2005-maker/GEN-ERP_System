import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BomService, BomProject, BomItem, BomRevision } from '../../services/bom.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-bom-revision-review',
  standalone: true,
  imports: [CommonModule, RouterModule],
  providers: [DatePipe],
  templateUrl: './bom-revision-review.component.html',
  styleUrls: ['./bom-revision-review.component.css']
})
export class BomRevisionReviewComponent implements OnInit {
  projectId!: number;
  revisionId!: number;
  
  project?: BomProject;
  revision?: BomRevision;
  reviewItems: BomItem[] = [];
  reviewDiff: any = null;
  
  loading = true;
  success = '';
  submitting = false;
  error = '';
  
  // Pagination for Snapshot
  snapshotCurrentPage = 1;
  snapshotPageSize = 20;

  // Pagination for Diff
  diffAddedCurrentPage = 1;
  diffRemovedCurrentPage = 1;
  diffModifiedCurrentPage = 1;
  diffPageSize = 10;

  canApprove = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bomService: BomService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.revisionId = Number(this.route.snapshot.paramMap.get('revId'));
    this.canApprove = this.authService.hasPermission('BOM', 'can_approve');

    if (this.projectId && this.revisionId) {
      this.loadData();
    } else {
      this.error = 'Invalid parameters.';
      this.loading = false;
    }
  }

  loadData() {
    this.loading = true;
    
    this.bomService.getBomProject(this.projectId).subscribe({
      next: (proj) => {
        this.project = proj;
        this.revision = proj.BomRevisions?.find(r => r.id === this.revisionId);
        
        this.bomService.getRevisionItems(this.revisionId).subscribe({
          next: (items) => {
            this.reviewItems = items;
            this.bomService.getRevisionDiff(this.revisionId).subscribe({
              next: (diff) => {
                this.reviewDiff = diff;
                this.loading = false;
              },
              error: (err) => {
                console.error('Failed to load diff:', err);
                this.loading = false;
              }
            });
          },
          error: (err) => {
            this.error = 'Failed to load revision items: ' + (err.error?.message || err.message);
            this.loading = false;
          }
        });
      },
      error: (err) => {
        this.error = 'Failed to load project: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  acceptRevision() {
    if (!this.canApprove || !this.revision) return;
    this.processApproval('Approved');
  }

  rejectRevision() {
    if (!this.canApprove || !this.revision) return;
    this.processApproval('Rejected');
  }

  private processApproval(status: 'Approved' | 'Rejected') {
    this.submitting = true;
    const currentUser = this.authService.getCurrentUser();
    const userName = currentUser?.name || 'Unknown';

    this.bomService.approveRevision(this.revisionId, status === 'Approved', userName, status).subscribe({
      next: (res: any) => {
        const updatedRevisionNo = res?.revision?.revision_no || this.revision?.revision_no;
        this.success = `Revision ${updatedRevisionNo} has been ${status.toLowerCase()} successfully.`;
        this.submitting = false;
        
        // Update local state
        if (this.revision) {
          this.revision.revision_no = updatedRevisionNo;
          this.revision.status = status;
          this.revision.is_approved = (status === 'Approved');
          this.revision.approved_by = (status === 'Approved' ? userName : undefined);
        }

        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        this.error = `Failed to ${status.toLowerCase()} revision: ` + (err.error?.message || err.message);
        this.submitting = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin/bom', this.projectId]);
  }

  // --- Pagination Getters ---
  get paginatedSnapshot() {
    const start = (this.snapshotCurrentPage - 1) * this.snapshotPageSize;
    return this.reviewItems.slice(start, start + this.snapshotPageSize);
  }

  get totalSnapshotPages() {
    return Math.ceil(this.reviewItems.length / this.snapshotPageSize) || 1;
  }

  get paginatedAdded() {
    if (!this.reviewDiff?.addedItems) return [];
    const start = (this.diffAddedCurrentPage - 1) * this.diffPageSize;
    return this.reviewDiff.addedItems.slice(start, start + this.diffPageSize);
  }

  get totalAddedPages() {
    return Math.ceil((this.reviewDiff?.addedItems?.length || 0) / this.diffPageSize) || 1;
  }

  get paginatedRemoved() {
    if (!this.reviewDiff?.removedItems) return [];
    const start = (this.diffRemovedCurrentPage - 1) * this.diffPageSize;
    return this.reviewDiff.removedItems.slice(start, start + this.diffPageSize);
  }

  get totalRemovedPages() {
    return Math.ceil((this.reviewDiff?.removedItems?.length || 0) / this.diffPageSize) || 1;
  }

  get paginatedModified() {
    if (!this.reviewDiff?.modifiedItems) return [];
    const start = (this.diffModifiedCurrentPage - 1) * this.diffPageSize;
    return this.reviewDiff.modifiedItems.slice(start, start + this.diffPageSize);
  }

  get totalModifiedPages() {
    return Math.ceil((this.reviewDiff?.modifiedItems?.length || 0) / this.diffPageSize) || 1;
  }
}
