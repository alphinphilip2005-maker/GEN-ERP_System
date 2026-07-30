import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { GrnService } from '../../services/grn.service';
import { ProjectService } from '../../services/project.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-iqc-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './iqc-list.component.html',
  styleUrls: ['./iqc-list.component.css']
})
export class IqcListComponent implements OnInit {
  grns: any[] = [];
  groupedGrns: { [key: string]: any[] } = {};
  projectGroups: any[] = [];
  selectedProject: string | null = null;
  searchTerm: string = '';
  projectSearchTerm: string = '';

  // Pagination
  currentPage = 1;
  pageSize = 20;

  get canEdit(): boolean {
    return this.authService.hasPermission('IQC', 'can_edit');
  }

  get canView(): boolean {
    return this.authService.hasPermission('IQC', 'can_view');
  }

  constructor(
    private grnService: GrnService, 
    private projectService: ProjectService, 
    public router: Router, 
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['project']) {
        this.selectedProject = params['project'];
      }
    });
    this.fetchProjectsAndGrns();
  }

  fetchProjectsAndGrns() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projectGroups = projects.map(p => ({
          name: p.project_name,
          code: p.project_code,
          count: 0
        }));
        this.fetchGrns();
      },
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  fetchGrns() {
    this.grnService.getAllGrns().subscribe({
      next: (data) => {
        // Exclude GRNs where ALL items have received_qty = 0 (nothing to inspect)
        this.grns = data.filter((grn: any) =>
          grn.GrnItems?.some((item: any) => Number(item.received_qty) > 0)
        );
        this.groupGrns();
      },
      error: (err) => console.error('Failed to load GRNs for IQC', err)
    });
  }

  groupGrns() {
    this.groupedGrns = {};
    // Initialize groups for all projects to ensure empty ones show up too
    this.projectGroups.forEach(proj => {
      this.groupedGrns[proj.name] = [];
    });
    
    this.grns.forEach(grn => {
      const projectName = grn.PurchaseOrder?.PurchaseRequest?.Project?.project_name || grn.PurchaseOrder?.project_name || 'General';
      if (!this.groupedGrns[projectName]) {
        this.groupedGrns[projectName] = [];
        // Add to projectGroups if it's a legacy GRN with a deleted/unknown project
        if (!this.projectGroups.some(p => p.name === projectName)) {
          this.projectGroups.push({ name: projectName, code: 'N/A', count: 0 });
        }
      }
      this.groupedGrns[projectName].push(grn);
    });

    // Update counts
    this.projectGroups.forEach(proj => {
      proj.count = this.groupedGrns[proj.name]?.length || 0;
    });
  }

  get filteredProjects() {
    if (!this.projectSearchTerm) return this.projectGroups;
    const term = this.projectSearchTerm.toLowerCase();
    return this.projectGroups.filter(p => p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term));
  }

  selectProject(projectName: string) {
    this.selectedProject = projectName;
    this.currentPage = 1; // Reset to page 1 on project change
  }

  backToProjects() {
    this.selectedProject = null;
  }

  get filteredGrns() {
    if (!this.selectedProject) return [];
    let list = this.groupedGrns[this.selectedProject] || [];
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(g => 
        g.grn_no.toLowerCase().includes(term) ||
        (g.PurchaseOrder?.PurchaseRequest?.pr_no || '').toLowerCase().includes(term) ||
        g.status.toLowerCase().includes(term)
      );
    }
    return list;
  }

  get displayedGrns() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredGrns.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredGrns.length / this.pageSize) || 1;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }
}
