import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemCategoryService, ItemCategory } from '../../services/item-category.service';

@Component({
  selector: 'app-item-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './item-category-list.component.html',
  styleUrls: ['./item-category-list.component.css']
})
export class ItemCategoryListComponent implements OnInit {
  categories: ItemCategory[] = [];
  filteredCategories: ItemCategory[] = [];
  searchQuery = '';
  loading = false;
  error = '';
  success = '';

  // Modal State
  showModal = false;
  isEditing = false;
  currentCategory: ItemCategory = { name: '', description: '' };

  constructor(private categoryService: ItemCategoryService) {}

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading = true;
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.filteredCategories = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load categories';
        this.loading = false;
      }
    });
  }

  filterCategories() {
    if (!this.searchQuery) {
      this.filteredCategories = this.categories;
      this.currentPage = 1;
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredCategories = this.categories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
    this.currentPage = 1;
  }

  // Pagination
  currentPage = 1;
  pageSize = 12;

  get paginatedCategories(): ItemCategory[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCategories.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredCategories.length / this.pageSize);
  }

  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }

  openAddModal() {
    this.isEditing = false;
    this.currentCategory = { name: '', description: '' };
    this.showModal = true;
    this.error = '';
    this.success = '';
  }

  openEditModal(cat: ItemCategory) {
    this.isEditing = true;
    this.currentCategory = { ...cat };
    this.showModal = true;
    this.error = '';
    this.success = '';
  }

  closeModal() {
    this.showModal = false;
  }

  saveCategory() {
    if (!this.currentCategory.name) {
      this.error = 'Category name is required';
      return;
    }

    if (this.isEditing && this.currentCategory.id) {
      this.categoryService.updateCategory(this.currentCategory.id, this.currentCategory).subscribe({
        next: () => {
          this.success = 'Category updated successfully';
          this.loadCategories();
          this.showModal = false;
        },
        error: (err) => this.error = 'Update failed: ' + (err.error?.message || err.message)
      });
    } else {
      this.categoryService.createCategory(this.currentCategory).subscribe({
        next: () => {
          this.success = 'Category created successfully';
          this.loadCategories();
          this.showModal = false;
        },
        error: (err) => this.error = 'Creation failed: ' + (err.error?.message || err.message)
      });
    }
  }

  deleteCategory(cat: ItemCategory) {
    if (!cat.id) return;
    if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      this.categoryService.deleteCategory(cat.id).subscribe({
        next: () => {
          this.success = 'Category deleted successfully';
          this.loadCategories();
        },
        error: (err) => this.error = 'Delete failed: ' + (err.error?.message || err.message)
      });
    }
  }
}
