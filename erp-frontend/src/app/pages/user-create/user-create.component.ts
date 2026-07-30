import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService, Module } from '../../services/user.service';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-create.component.html',
  styleUrls: ['./user-create.component.css']
})
export class UserCreateComponent implements OnInit {
  user = {
    name: '',
    email: '',
    password: '',
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
  error = '';
  
  showPassword = false;
  showConfirmPassword = false;

  designations = ['R&D Head', 'Project Lead', 'QA', 'QC', 'QA Head', 'Purchase officer', 'Purchase Manager', 'Production', 'O&M', 'Storekeeper', 'Finance'];
  departments = ['Purchase', 'Production', 'O&M', 'R&D', 'Finance', 'Quality', 'Store'];

  constructor(private userService: UserService, private router: Router) {}

  ngOnInit() {
    this.loadModules();
  }

  loadModules() {
    this.userService.getModules().subscribe({
      next: (mods) => {
        this.modules = mods;
        this.moduleRights = mods.map(m => ({
          module_id: m.id,
          module_name: m.module_name,
          can_view: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
          can_create: false,
          expanded: false
        }));
      },
      error: () => {
        this.error = 'Failed to load modules for rights configuration.';
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
    if (!this.user.employee_id) {
      this.error = 'Please enter Employee ID.';
      return;
    }

    if (this.user.password !== this.user.confirmPassword) {
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

    const payload = {
      ...userData,
      rights
    };

    this.userService.createUser(payload).subscribe({
      next: () => {
        this.router.navigate(['/admin/users']);
      },
      error: (err) => {
        this.submitting = false;
        this.error = err.error?.message || 'Error occurred while creating user.';
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
