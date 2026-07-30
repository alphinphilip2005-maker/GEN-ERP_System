import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VendorService, Vendor } from '../../services/vendor.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-vendor-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './vendor-list.component.html',
  styleUrls: ['./vendor-list.component.css']
})
export class VendorListComponent implements OnInit {
  vendors: Vendor[] = [];
  filteredVendors: Vendor[] = [];
  searchQuery = '';
  loading = true;
  error = '';
  success = '';

  canCreate = false;
  canEdit = false;
  canDelete = false;

  constructor(private vendorService: VendorService, private authService: AuthService) {}

  ngOnInit() {
    this.canCreate = this.authService.hasPermission('Vendor Master', 'can_create');
    this.canEdit = this.authService.hasPermission('Vendor Master', 'can_edit');
    this.canDelete = this.authService.hasPermission('Vendor Master', 'can_delete');
    this.loadVendors();
  }

  loadVendors() {
    this.loading = true;
    this.vendorService.getVendors().subscribe({
      next: (data) => {
        this.vendors = data;
        this.filterVendors();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load vendors: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  filterVendors() {
    if (!this.searchQuery.trim()) {
      this.filteredVendors = [...this.vendors];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredVendors = this.vendors.filter(v => 
        v.vendor_code.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        (v.city && v.city.toLowerCase().includes(q)) ||
        (v.contact_person && v.contact_person.toLowerCase().includes(q))
      );
    }
    this.currentPage = 1;
  }

  // Pagination
  currentPage = 1;
  pageSize = 12;

  get paginatedVendors(): Vendor[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredVendors.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredVendors.length / this.pageSize);
  }

  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }

  deleteVendor(id: number | undefined) {
    if (!id || !confirm('Are you sure you want to delete this vendor?')) return;

    this.vendorService.deleteVendor(id).subscribe({
      next: () => {
        this.success = 'Vendor deleted successfully.';
        this.loadVendors();
      },
      error: (err) => {
        this.error = 'Failed to delete vendor: ' + (err.error?.message || err.message);
      }
    });
  }
}
