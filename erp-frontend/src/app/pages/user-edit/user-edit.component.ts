import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserService, Module, User } from '../../services/user.service';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.css']
})
export class UserEditComponent implements OnInit {
  userId!: number;
  user = {
    name: '',
    email: '',
    password: '', // Option to change password
    confirmPassword: '',
    employee_id: '',
    designation: '',
    department: '',
    phone: ''
  };

  modules: Module[] = [];
  moduleRights: any[] = [];
  rightsSnapshot: string = ''; // To revert on cancel
  showRightsModal = false;
  submitting = false;
  loading = true;
  error = '';
  
  showPassword = false;
  showConfirmPassword = false;

  designations = ['R&D Head', 'Project Lead', 'QA', 'QC', 'QA Head', 'Purchase officer', 'Purchase Manager', 'Production', 'O&M', 'Storekeeper', 'Finance'];
  departments = ['Purchase', 'Production', 'O&M', 'R&D', 'Finance', 'Quality', 'Store'];

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadModules();
  }

  loadModules() {
    this.userService.getModules().subscribe({
      next: (mods) => {
        this.modules = mods;
        this.loadUserData();
      },
      error: () => {
        this.error = 'Failed to load modules.';
        this.loading = false;
      }
    });
  }

  loadUserData() {
    this.userService.getUser(this.userId).subscribe({
      next: (userData) => {
        this.user = {
          ...this.user,
          name: userData.name,
          email: userData.email,
          employee_id: userData.employee_id,
          designation: userData.designation,
          department: userData.department,
          phone: userData.phone
        };

        // Map existing permissions to modules
        this.moduleRights = this.modules.map(m => {
          const existing = userData.Permissions?.find(p => p.module_id === m.id);
          return {
            module_id: m.id,
            module_name: m.module_name,
            can_view: existing?.can_view || false,
            can_edit: existing?.can_edit || false,
            can_delete: existing?.can_delete || false,
            can_approve: existing?.can_approve || false,
            can_create: existing?.can_create || false,
            expanded: false
          };
        });

        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load user data.';
        this.loading = false;
      }
    });
  }

  openRightsModal() {
    this.rightsSnapshot = JSON.stringify(this.moduleRights);
    this.showRightsModal = true;
  }

  cancelRightsModal() {
    if (this.rightsSnapshot) {
      this.moduleRights = JSON.parse(this.rightsSnapshot);
    }
    this.closeRightsModal();
  }

  closeRightsModal() {
    this.showRightsModal = false;
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

  onSubmit() {
    if (this.user.password && this.user.password !== this.user.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.submitting = true;
    this.error = '';

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

    const { confirmPassword, ...userData } = this.user;

    // Update user details
    this.userService.updateUser(this.userId, userData).subscribe({
      next: () => {
        // Update user rights
        this.userService.updateUserRights(this.userId, rights).subscribe({
          next: () => {
            this.router.navigate(['/admin/users']);
          },
          error: () => {
            this.submitting = false;
            this.error = 'Failed to update user rights.';
          }
        });
      },
      error: (err) => {
        this.submitting = false;
        this.error = err.error?.message || 'Error occurred while updating user.';
      }
    });
  }

  onPhoneInput(event: any) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 10) {
      value = value.slice(0, 10); // Limit to 10
    }
    input.value = value;
    this.user.phone = value;
  }
}
