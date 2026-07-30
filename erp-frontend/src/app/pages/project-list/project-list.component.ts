import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService, Project } from '../../services/project.service';
import { UserService, User } from '../../services/user.service';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.css']
})
export class ProjectListComponent implements OnInit {
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  projectLeads: User[] = [];
  searchQuery = '';
  loading = false;
  error = '';
  success = '';

  // Modal State
  showModal = false;
  isEditing = false;
  currentProject: Partial<Project> = { project_code: '', project_name: '', project_lead_id: null };

  constructor(
    private projectService: ProjectService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadProjects();
  }

  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (users) => {
        try {
          if (Array.isArray(users)) {
            // Safe filtering in case designation is missing or not a string
            this.projectLeads = users.filter(u => 
              u && typeof u.designation === 'string' && u.designation.toLowerCase().includes('lead')
            );
          } else {
            console.warn('Expected array of users, got:', users);
            this.projectLeads = [];
          }
        } catch (e) {
          console.error('Error filtering users:', e);
          this.projectLeads = [];
        }
      },
      error: (err) => {
        console.error('Project Leads API Error:', err);
        // Only set the error message if it's a critical HTTP error
        this.error = 'Failed to load project leads: ' + (err.error?.message || err.statusText || 'Unknown Error');
      }
    });
  }

  loadProjects() {
    this.loading = true;
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects = data;
        this.filteredProjects = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load projects';
        this.loading = false;
      }
    });
  }

  filterProjects() {
    if (!this.searchQuery) {
      this.filteredProjects = this.projects;
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredProjects = this.projects.filter(p =>
      p.project_name.toLowerCase().includes(q) ||
      p.project_code.toLowerCase().includes(q) ||
      (p.Lead?.name || '').toLowerCase().includes(q)
    );
  }

  openAddModal() {
    this.isEditing = false;
    this.currentProject = { project_code: '', project_name: '', project_lead_id: null };
    this.showModal = true;
    this.error = '';
    this.success = '';
  }

  openEditModal(project: Project) {
    this.isEditing = true;
    this.currentProject = { ...project };
    this.showModal = true;
    this.error = '';
    this.success = '';
  }

  closeModal() {
    this.showModal = false;
  }

  saveProject() {
    if (!this.currentProject.project_code || !this.currentProject.project_name) {
      this.error = 'Project Code and Name are required';
      return;
    }

    if (this.isEditing && this.currentProject.id) {
      this.projectService.updateProject(this.currentProject.id, this.currentProject).subscribe({
        next: () => {
          this.success = 'Project updated successfully';
          this.loadProjects();
          this.showModal = false;
        },
        error: (err) => this.error = 'Update failed: ' + (err.error?.message || err.message)
      });
    } else {
      this.projectService.createProject(this.currentProject).subscribe({
        next: () => {
          this.success = 'Project created successfully';
          this.loadProjects();
          this.showModal = false;
        },
        error: (err) => this.error = 'Creation failed: ' + (err.error?.message || err.message)
      });
    }
  }

  deleteProject(project: Project) {
    if (!project.id) return;
    if (confirm(`Are you sure you want to delete Project "${project.project_code}"?`)) {
      this.projectService.deleteProject(project.id).subscribe({
        next: () => {
          this.success = 'Project deleted successfully';
          this.loadProjects();
        },
        error: (err) => this.error = 'Delete failed: ' + (err.error?.message || err.message)
      });
    }
  }
}
