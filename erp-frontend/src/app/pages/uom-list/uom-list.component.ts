import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UomService, Uom } from '../../services/uom.service';

@Component({
  selector: 'app-uom-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './uom-list.component.html',
  styleUrls: ['./uom-list.component.css']
})
export class UomListComponent implements OnInit {
  uoms: Uom[] = [];
  filteredUoms: Uom[] = [];
  searchQuery = '';
  loading = false;
  error = '';
  success = '';

  // Modal State
  showModal = false;
  isEditing = false;
  currentUom: Uom = { name: '', description: '' };

  constructor(private uomService: UomService) {}

  ngOnInit() {
    this.loadUoms();
  }

  loadUoms() {
    this.loading = true;
    this.uomService.getUoms().subscribe({
      next: (data) => {
        this.uoms = data;
        this.filteredUoms = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load UOMs';
        this.loading = false;
      }
    });
  }

  filterUoms() {
    if (!this.searchQuery) {
      this.filteredUoms = this.uoms;
      this.currentPage = 1;
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredUoms = this.uoms.filter(u =>
      u.name.toLowerCase().includes(q) ||
      (u.description || '').toLowerCase().includes(q)
    );
    this.currentPage = 1;
  }

  // Pagination
  currentPage = 1;
  pageSize = 12;

  get paginatedUoms(): Uom[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUoms.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUoms.length / this.pageSize);
  }

  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }

  openAddModal() {
    this.isEditing = false;
    this.currentUom = { name: '', description: '' };
    this.showModal = true;
    this.error = '';
    this.success = '';
  }

  openEditModal(uom: Uom) {
    this.isEditing = true;
    this.currentUom = { ...uom };
    this.showModal = true;
    this.error = '';
    this.success = '';
  }

  closeModal() {
    this.showModal = false;
  }

  saveUom() {
    if (!this.currentUom.name) {
      this.error = 'UOM name is required';
      return;
    }

    if (this.isEditing && this.currentUom.id) {
      this.uomService.updateUom(this.currentUom.id, this.currentUom).subscribe({
        next: () => {
          this.success = 'UOM updated successfully';
          this.loadUoms();
          this.showModal = false;
        },
        error: (err) => this.error = 'Update failed: ' + (err.error?.message || err.message)
      });
    } else {
      this.uomService.createUom(this.currentUom).subscribe({
        next: () => {
          this.success = 'UOM created successfully';
          this.loadUoms();
          this.showModal = false;
        },
        error: (err) => this.error = 'Creation failed: ' + (err.error?.message || err.message)
      });
    }
  }

  deleteUom(uom: Uom) {
    if (!uom.id) return;
    if (confirm(`Are you sure you want to delete UOM "${uom.name}"?`)) {
      this.uomService.deleteUom(uom.id).subscribe({
        next: () => {
          this.success = 'UOM deleted successfully';
          this.loadUoms();
        },
        error: (err) => this.error = 'Delete failed: ' + (err.error?.message || err.message)
      });
    }
  }
}
