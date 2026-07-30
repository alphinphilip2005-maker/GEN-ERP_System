import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BomService, BomProject } from '../../services/bom.service';

import { ProjectService, Project } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';

interface BomUploadIssue {
  row: number;
  sheet: string;
  code: string;
}

@Component({
  selector: 'app-bom-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './bom-list.component.html',
  styleUrls: ['./bom-list.component.css']
})
export class BomListComponent implements OnInit {
  projects: BomProject[] = [];
  filteredProjects: BomProject[] = [];
  searchQuery = '';
  loading = true;
  error = '';
  
  // Project Master data
  masterProjects: Project[] = [];
  // Modal states
  showAddModal = false;
  newProjectId: number | null = null;
  newRevision = '00';
  newReleasedOn = '';
  selectedFile: File | null = null;
  fileInputError = '';
  parsedBomItems: any[] = [];
  uploadMissingItems: BomUploadIssue[] = [];
  addModalError = '';
  addModalSuccess = '';
  parsingUpload = false;
  submitting = false;
  canCreate = false;

  constructor(
    private bomService: BomService, 
    private projectService: ProjectService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.canCreate = this.authService.hasPermission('BOM', 'can_create');
    this.loadProjects();
    this.loadMasterProjects();
  }

  downloadTemplate() {
    this.bomService.downloadTemplate();
  }

  loadMasterProjects() {
    this.projectService.getProjects().subscribe({
      next: (data) => {
        const currentUser = this.authService.getCurrentUser();
        const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
        
        if (isAdmin) {
          this.masterProjects = data;
        } else if (currentUser) {
          // Filter to show only projects where the current user is the lead
          this.masterProjects = data.filter(p => p.project_lead_id === currentUser.id);
        } else {
          this.masterProjects = [];
        }
      },
      error: (err) => {
        console.error('Failed to load master projects', err);
      }
    });
  }

  loadProjects() {
    this.loading = true;
    this.bomService.getBomProjects().subscribe({
      next: (data) => {
        this.projects = data;
        this.filterProjects();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load BOM projects: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  filterProjects() {
    if (!this.searchQuery.trim()) {
      this.filteredProjects = [...this.projects];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredProjects = this.projects.filter(p => p.project_name.toLowerCase().includes(q));
    }
  }

  openAddModal() {
    this.newProjectId = null;
    this.newRevision = '00';
    this.newReleasedOn = new Date().toISOString().split('T')[0];
    this.selectedFile = null;
    this.fileInputError = '';
    this.parsedBomItems = [];
    this.uploadMissingItems = [];
    this.addModalError = '';
    this.addModalSuccess = '';
    this.parsingUpload = false;
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  onFileSelected(event: any) {
    this.parsedBomItems = [];
    this.uploadMissingItems = [];
    this.addModalError = '';
    this.addModalSuccess = '';

    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0] as File;
      const isExcelFile =
        file.name.toLowerCase().endsWith('.xlsx') ||
        file.name.toLowerCase().endsWith('.xls');

      if (!isExcelFile) {
        this.selectedFile = null;
        this.fileInputError = 'Please upload a valid Excel file (.xlsx or .xls) for BOM import.';
        event.target.value = '';
        return;
      }

      this.selectedFile = file;
      this.fileInputError = '';
      this.parseSelectedFile();
    }
  }

  parseSelectedFile() {
    if (!this.selectedFile) return;

    this.parsingUpload = true;
    this.addModalError = '';
    this.addModalSuccess = '';
    this.uploadMissingItems = [];
    this.parsedBomItems = [];

    this.bomService.parseBomExcel(this.selectedFile).subscribe({
      next: (res) => {
        this.parsingUpload = false;
        this.uploadMissingItems = res.missingItems || [];

        if (!res.validItems?.length) {
          this.addModalError = 'The uploaded BOM Excel file does not contain any importable rows. Please fill the template with item codes and quantities, then try again.';
          return;
        }

        if (this.uploadMissingItems.length) {
          this.addModalError = `${this.uploadMissingItems.length} item(s) were not found in Item Master. Review the sheet and row details below.`;
          return;
        }

        this.parsedBomItems = res.validItems || [];
        this.addModalSuccess = `${this.parsedBomItems.length} BOM item(s) validated successfully and are ready to import.`;
      },
      error: (err) => {
        this.parsingUpload = false;
        this.addModalError = 'Failed to read BOM Excel file: ' + (err.error?.message || err.message);
      }
    });
  }

  createProject() {
    if (!this.newProjectId) return;
    this.submitting = true;
    this.error = '';
    this.addModalError = '';
    
    const selectedProj = this.masterProjects.find(p => p.id === this.newProjectId);
    const projectName = selectedProj ? selectedProj.project_name : 'Unknown Project';

    const currentUser = this.authService.getCurrentUser();
    const userName = currentUser?.name || 'Unknown User';
    const createProjectWithItems = (items: any[] = []) => {
      const payload = { 
        project_name: projectName,
        project_id: this.newProjectId,
        current_revision: this.newRevision,
        released_on: this.newReleasedOn,
        uploaded_by: userName,
        items
      };

      this.bomService.createBomProject(payload).subscribe({
        next: (project) => {
          this.addModalSuccess = `Project created successfully with ${items.length} imported BOM item(s).`;
          this.submitting = false;
          setTimeout(() => {
            this.closeAddModal();
            this.router.navigate(['/admin/bom', project.id]);
          }, 800);
        },
        error: (err) => {
          this.addModalError = 'Failed to create project: ' + (err.error?.message || err.message);
          this.submitting = false;
        }
      });
    };

    if (this.selectedFile) {
      if (this.parsingUpload) {
        this.addModalError = 'Please wait until the BOM file validation is complete.';
        this.submitting = false;
        return;
      }

      if (this.uploadMissingItems.length) {
        this.addModalError = `${this.uploadMissingItems.length} item(s) are still missing from Item Master. Please correct them before creating the project.`;
        this.submitting = false;
        return;
      }

      if (!this.parsedBomItems.length) {
        this.addModalError = 'Please upload a valid BOM Excel file with importable rows before creating the project.';
        this.submitting = false;
        return;
      }

      createProjectWithItems(this.parsedBomItems);
      return;
    }

    createProjectWithItems();
  }
}
