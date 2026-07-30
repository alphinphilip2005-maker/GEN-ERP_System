import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { VendorService, Vendor } from '../../services/vendor.service';

@Component({
  selector: 'app-vendor-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './vendor-create.component.html',
  styleUrls: ['./vendor-create.component.css']
})
export class VendorCreateComponent {
  vendor: Vendor = {
    vendor_code: '',
    name: '',
    street: '',
    city: '',
    state: '',
    country: '',
    pin: '',
    contact_person: '',
    phone: '',
    email: '',
    gst_number: '',
    pan: '',
    msme: '',
    contact_details: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_name: '',
    branch_name: ''
  };

  submitting = false;
  error = '';
  success = '';
  codeExists = false;

  constructor(private vendorService: VendorService, private router: Router) {}

  checkCode() {
    if (!this.vendor.vendor_code) {
      this.codeExists = false;
      return;
    }

    this.vendorService.checkDuplicateCode(this.vendor.vendor_code).subscribe({
      next: (res) => {
        this.codeExists = res.exists;
        if (this.codeExists) {
          this.error = 'Warning: This Vendor Code already exists in the system.';
        } else if (this.error === 'Warning: This Vendor Code already exists in the system.') {
          this.error = '';
        }
      },
      error: () => {
        this.codeExists = false;
      }
    });
  }

  capitalizeWords(field: keyof Vendor) {
    const value = this.vendor[field] as string;
    if (!value) return;
    (this.vendor as any)[field] = value.replace(/\b\w/g, c => c.toUpperCase());
  }

  allowLettersOnly(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow A-Z, a-z, and space
    if ((charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122) || charCode === 32) {
      return true;
    }
    event.preventDefault();
    return false;
  }

  allowNumbersOnly(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow 0-9
    if (charCode >= 48 && charCode <= 57) {
      return true;
    }
    event.preventDefault();
    return false;
  }

  onSubmit() {
    this.submitting = true;
    this.error = '';
    this.success = '';

    this.vendorService.createVendor(this.vendor).subscribe({
      next: () => {
        this.success = 'Vendor created successfully! Redirecting...';
        setTimeout(() => this.router.navigate(['/admin/vendors']), 1500);
      },
      error: (err) => {
        this.error = 'Failed to create vendor: ' + (err.error?.message || err.message);
        this.submitting = false;
      }
    });
  }
}
