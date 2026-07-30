import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-create.component.html',
  styleUrls: ['./user-create.component.css']
})
export class UserCreateComponent {
  userData = {
    name: '',
    email: '',
    designation: '',
    password: '',
    employeeId: '',
    phoneNumber: '',
    department: '',
    confirmPassword: ''
  };

  showRightsModal = false;

  rightsList = [
    { name: 'Maker', selected: false },
    { name: 'Purchase Request', selected: false },
    { name: 'Quotation Management', selected: false },
    { name: 'Purchase Order', selected: false },
    { name: 'GRN', selected: false },
    { name: 'QC', selected: false },
    { name: 'Store', selected: false },
    { name: 'MRN', selected: false },
    { name: 'Production Planning', selected: false },
    { name: 'WIP', selected: false },
    { name: 'Stock Out', selected: false }
  ];

  openRightsModal() {
    this.showRightsModal = true;
  }

  closeRightsModal() {
    this.showRightsModal = false;
  }

  submitRights() {
    // save rights
    this.showRightsModal = false;
  }

  onRegister() {
    if (this.userData.password !== this.userData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    
    const selectedRights = this.rightsList.filter(r => r.selected).map(r => r.name);
    
    console.log('Register User', this.userData, 'Rights', selectedRights);
    alert('User Registered Successfully (Mocked)');
  }
}
