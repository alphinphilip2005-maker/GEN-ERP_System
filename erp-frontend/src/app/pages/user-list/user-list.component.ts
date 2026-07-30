import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService, User, Module, Permission } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  searchText = '';
  loading = true;
  error = '';

  // Rights modal
  showRightsModal = false;
  selectedUser: User | null = null;
  modules: Module[] = [];
  moduleRights: any[] = [];
  savingRights = false;

  // Pagination
  currentPage = 1;
  pageSize = 6;

  // Delete confirm
  deletingUserId: number | null = null;

  constructor(
    private userService: UserService, 
    private router: Router,
    private authService: AuthService,
    private location: Location
  ) {}

  goBack() {
    this.router.navigate(['/admin/dashboard']);
  }

  ngOnInit() {
    this.loadUsers();
    this.loadModules();
  }

  loadUsers() {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load users. Please make sure the backend is running.';
        this.loading = false;
      }
    });
  }

  loadModules() {
    this.userService.getModules().subscribe({
      next: (mods) => this.modules = mods,
      error: () => {}
    });
  }

  applyFilter() {
    const q = this.searchText.toLowerCase();
    this.filteredUsers = this.users
      .filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.employee_id?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const isAdminA = a.designation === 'Administrator' || a.name === 'Admin User';
        const isAdminB = b.designation === 'Administrator' || b.name === 'Admin User';
        
        if (isAdminA && !isAdminB) return -1;
        if (!isAdminA && isAdminB) return 1;

        const deptA = a.department || '';
        const deptB = b.department || '';
        return deptA.localeCompare(deptB);
      });
    this.currentPage = 1;
  }

  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.pageSize);
  }

  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }

  editUser(user: User) {
    this.router.navigate(['/admin/users', user.id, 'edit']);
  }

  openRightsModal(user: User) {
    this.selectedUser = user;
    this.moduleRights = this.modules.map(mod => {
      const existing = user.Permissions?.find(p => p.Module?.id === mod.id || p.module_id === mod.id);
      return {
        module_id: mod.id,
        module_name: mod.module_name,
        expanded: false,
        can_view: existing?.can_view || false,
        can_edit: existing?.can_edit || false,
        can_delete: existing?.can_delete || false,
        can_approve: existing?.can_approve || false,
        can_create: existing?.can_create || false
      };
    });
    this.showRightsModal = true;
  }

  closeRightsModal() {
    this.showRightsModal = false;
    this.selectedUser = null;
  }

  toggleExpand(right: any) {
    right.expanded = !right.expanded;
  }

  isModuleChecked(right: any): boolean {
    return right.can_view || right.can_edit || right.can_delete || right.can_approve || right.can_create;
  }

  toggleModule(right: any) {
    const val = !this.isModuleChecked(right);
    right.can_view = val;
    right.can_edit = val;
    right.can_delete = val;
    right.can_approve = val;
    right.can_create = val;
  }

  selectAll() {
    this.moduleRights.forEach(r => {
      r.can_view = r.can_edit = r.can_delete = r.can_approve = r.can_create = true;
    });
  }

  deselectAll() {
    this.moduleRights.forEach(r => {
      r.can_view = r.can_edit = r.can_delete = r.can_approve = r.can_create = false;
    });
  }

  saveRights() {
    if (!this.selectedUser) return;
    this.savingRights = true;
    const rights = this.moduleRights
      .filter(r => r.can_view || r.can_edit || r.can_delete || r.can_approve || r.can_create)
      .map(r => ({
        module_id: r.module_id,
        can_view: r.can_view,
        can_edit: r.can_edit,
        can_delete: r.can_delete,
        can_approve: r.can_approve,
        can_create: r.can_create
      }));

    this.userService.updateUserRights(this.selectedUser.id, rights).subscribe({
      next: () => {
        this.savingRights = false;
        
        // If the updated user is the currently logged-in user, refresh their localStorage instantly!
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.id === this.selectedUser!.id) {
          currentUser.permissions = this.moduleRights.map(r => ({
            module: r.module_name,
            can_view: r.can_view,
            can_edit: r.can_edit,
            can_delete: r.can_delete,
            can_approve: r.can_approve,
            can_create: r.can_create
          }));
          localStorage.setItem('erp_user', JSON.stringify(currentUser));
        }

        this.closeRightsModal();
        this.loadUsers();
      },
      error: () => {
        this.savingRights = false;
        alert('Failed to save rights.');
      }
    });
  }

  confirmDelete(user: User) {
    if (confirm(`Delete user "${user.name}"?`)) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => this.loadUsers(),
        error: () => alert('Failed to delete user.')
      });
    }
  }
}
