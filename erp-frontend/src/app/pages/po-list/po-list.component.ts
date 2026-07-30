import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PoService, PurchaseOrder } from '../../services/po.service';
import { ProjectService, Project } from '../../services/project.service';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-po-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './po-list.component.html',
  styleUrls: ['./po-list.component.css']
})
export class PoListComponent implements OnInit {
  orders: PurchaseOrder[] = [];
  allProjects: Project[] = [];
  activeProject: string | null = null;
  
  loading = true;
  error = '';

  searchQuery = '';
  filterStatus = '';
  filterReview = '';
  filterDate = '';
  showFilterPanel = false;

  currentPage = 1;
  pageSize = 10;

  statusOptions = [
    'PENDING APPROVAL',
    'APPROVED',
    'PARTIALLY RECEIVED',
    'FULLY RECEIVED',
    'QC PENDING',
    'QC FAILED',
    'CLOSED'
  ];

  get canCreate(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    return user.role === 'admin' || this.authService.hasPermission('Purchase Order', 'can_create');
  }

  get canEdit(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    return user.role === 'admin' || this.authService.hasPermission('Purchase Order', 'can_edit');
  }

  get canDelete(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    return user.role === 'admin' || this.authService.hasPermission('Purchase Order', 'can_delete');
  }

  constructor(
    private poService: PoService, 
    private projectService: ProjectService, 
    private router: Router, 
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Exclusivity Gate
    const user = this.authService.getCurrentUser();
    const des = (user?.designation || '').toLowerCase().trim();
    const hasViewPermission = this.authService.hasPermission('Purchase Order', 'can_view');
    const isAllowed = user?.role === 'admin' || des === 'purchase manager' || des === 'purchase officer' || hasViewPermission;
    if (!isAllowed) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    this.route.queryParams.subscribe(params => {
      if (params['project']) {
        this.activeProject = params['project'];
      }
    });

    forkJoin({
      pos: this.poService.getPurchaseOrders(),
      projects: this.projectService.getProjects()
    }).subscribe({
      next: ({ pos, projects }) => {
        this.orders = pos;
        // Build full project list merging master + PO history
        const poProjectNames = pos.map(po => po.project_name).filter(Boolean);
        const extraProjects: any[] = poProjectNames
          .filter(name => !projects.find(p => p.project_name === name))
          .filter((v, i, a) => a.indexOf(v) === i)
          .map(name => ({ project_name: name, project_code: name }));
        this.allProjects = [...projects, ...extraProjects];
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load data.';
        this.loading = false;
      }
    });
  }

  get filteredProjects(): any[] {
    const q = this.searchQuery.toLowerCase();
    return this.allProjects.filter(p =>
      !q || p.project_name?.toLowerCase().includes(q)
    );
  }

  getPoCount(projectName: string): number {
    return this.orders.filter(o => o.project_name === projectName).length;
  }

  get filteredOrders(): PurchaseOrder[] {
    if (!this.activeProject) return [];
    
    return this.orders.filter(po => {
      // 1. Project Match
      const matchProject = po.project_name === this.activeProject;
      if (!matchProject) return false;

      // 2. Status Filter
      if (this.filterStatus) {
        if (this.getStatusLabel(po).toUpperCase() !== this.filterStatus.toUpperCase()) {
          return false;
        }
      }

      // 3. Review Filter (Approved/Pending)
      if (this.filterReview) {
        if (this.filterReview === 'APPROVED' && !po.is_approved) return false;
        if (this.filterReview === 'PENDING' && po.is_approved) return false;
      }

      // 4. Date Filter
      if (this.filterDate && !po.po_date?.includes(this.filterDate)) return false;

      // 5. Search Query (PO No or Vendor Name)
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const poNoMatch = po.po_no?.toLowerCase().includes(q);
        const vendorMatch = po.ToVendor?.name?.toLowerCase().includes(q);
        if (!poNoMatch && !vendorMatch) return false;
      }

      return true;
    });
  }

  toggleFilterPanel() {
    this.showFilterPanel = !this.showFilterPanel;
  }

  get paginatedOrders(): PurchaseOrder[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredOrders.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredOrders.length / this.pageSize) || 1;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  resetFilters() {
    this.filterStatus = '';
    this.filterReview = '';
    this.filterDate = '';
    this.searchQuery = '';
    this.currentPage = 1;
  }

  selectProject(project: string | null) {
    this.activeProject = project;
    this.currentPage = 1;
  }

  getAgeDays(po: PurchaseOrder): number {
    const poDate = new Date(po.po_date).getTime();
    const now = new Date().getTime();
    return Math.floor(Math.abs(now - poDate) / (1000 * 60 * 60 * 24));
  }

  getAgeColor(po: PurchaseOrder): string {
    const status = po.status?.toUpperCase() || '';
    if (status === 'QC ACCEPTED' || status === 'CLOSED') return 'badge-green';
    const diffDays = this.getAgeDays(po);
    if (diffDays <= 3) return 'badge-green';
    if (diffDays <= 7) return 'badge-orange';
    return 'badge-red';
  }

  getApproverName(po: any): string {
    if (!po.is_approved) return '';
    if (po.approved_by_id === 1) return 'admin';
    if (po.PurchaseManager && po.PurchaseManager.name) {
      const designation = po.PurchaseManager.designation || 'Purchase Manager';
      return `${po.PurchaseManager.name} - ${designation}`;
    }
    return 'admin';
  }

  getStatusLabel(po: any): string {
    if (!po?.status) return 'UNKNOWN';
    const s = po.status.trim().toUpperCase();
    if (s === 'OPEN' || s === 'GENERATED' || s === 'PENDING APPROVAL') return 'PENDING APPROVAL';
    if (s === 'SEND TO VENDOR' || s === 'APPROVED') return 'APPROVED';
    if (s === 'PARTIALLY RECEIVED' || s.includes('PARTIAL')) return 'PARTIALLY RECEIVED';
    if (s === 'ITEM RECEIVED' || s.includes('RECIVED') || s === 'FULLY RECEIVED') return 'FULLY RECEIVED';
    if (s === 'QC PENDING' || s === 'PENDING') return 'QC PENDING';
    if (s === 'QC REJECTED' || s === 'QC FAILED') return 'QC FAILED';
    if (s === 'CLOSED' || s === 'QC ACCEPTED') return 'CLOSED';
    return s;
  }

  getStatusColor(po: any): string {
    const s = this.getStatusLabel(po).toUpperCase();
    if (s === 'PENDING APPROVAL') return 'badge-orange';
    if (s === 'CLOSED') return 'badge-green';
    if (s === 'APPROVED') return 'badge-blue';
    if (s === 'FULLY RECEIVED' || s === 'PARTIALLY RECEIVED') return 'badge-cyan';
    if (s === 'QC FAILED') return 'badge-red';
    if (s === 'QC PENDING') return 'badge-orange';
    return 'badge-grey';
  }

  viewPO(event: Event, id: number) {
    event.stopPropagation();
    this.router.navigate(['/admin/po', id]);
  }

  editPO(event: Event, id: number) {
    event.stopPropagation();
    this.router.navigate(['/admin/po', id, 'edit']);
  }

  deletePO(event: Event, po: PurchaseOrder) {
    event.stopPropagation();
    if (!confirm(`Are you sure you want to delete PO ${po.po_no}? This action cannot be undone.`)) return;
    this.poService.deletePurchaseOrder(po.id!).subscribe({
      next: () => {
        this.orders = this.orders.filter(o => o.id !== po.id);
        const poProjectNames = this.orders.map(o => o.project_name).filter(Boolean);
        this.allProjects = this.allProjects.filter(p => p.id || poProjectNames.includes(p.project_name));
        if (this.filteredOrders.length === 0) this.activeProject = null;
      },
      error: (err) => {
        alert('Failed to delete PO: ' + (err.error?.error || 'Unknown error'));
      }
    });
  }
}
