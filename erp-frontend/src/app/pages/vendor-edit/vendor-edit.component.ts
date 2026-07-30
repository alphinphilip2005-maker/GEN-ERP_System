import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { VendorService, Vendor } from '../../services/vendor.service';

@Component({
  selector: 'app-vendor-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './vendor-edit.component.html',
  styleUrls: ['./vendor-edit.component.css']
})
export class VendorEditComponent implements OnInit {
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

  id!: number;
  loading = true;
  submitting = false;
  error = '';
  success = '';
  codeExists = false;
  originalCode = '';

  constructor(
    private route: ActivatedRoute,
    private vendorService: VendorService,
    private router: Router
  ) {}

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    if (this.id) {
      this.loadVendor();
    } else {
      this.error = 'Invalid Vendor ID';
      this.loading = false;
    }
  }

  loadVendor() {
    this.vendorService.getVendor(this.id).subscribe({
      next: (data) => {
        this.vendor = data;
        this.originalCode = data.vendor_code;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load vendor: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  checkCode() {
    if (!this.vendor.vendor_code || this.vendor.vendor_code === this.originalCode) {
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
    if ((charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122) || charCode === 32) {
      return true;
    }
    event.preventDefault();
    return false;
  }

  allowNumbersOnly(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
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

    this.vendorService.updateVendor(this.id, this.vendor).subscribe({
      next: () => {
        this.success = 'Vendor updated successfully! Redirecting...';
        setTimeout(() => this.router.navigate(['/admin/vendors']), 1500);
      },
      error: (err) => {
        this.error = 'Failed to update vendor: ' + (err.error?.message || err.message);
        this.submitting = false;
      }
    });
  }
}
