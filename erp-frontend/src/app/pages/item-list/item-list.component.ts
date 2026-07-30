import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ItemService, Item } from '../../services/item.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-item-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './item-list.component.html',
  styleUrls: ['./item-list.component.css']
})
export class ItemListComponent implements OnInit {
  items: Item[] = [];
  filteredItems: Item[] = [];
  searchQuery = '';
  loading = true;
  error = '';
  success = '';

  canCreate = false;
  canEdit = false;
  canDelete = false;

  constructor(private itemService: ItemService, private authService: AuthService) {}

  ngOnInit() {
    this.canCreate = this.authService.hasPermission('Item Master', 'can_create');
    this.canEdit = this.authService.hasPermission('Item Master', 'can_edit');
    this.canDelete = this.authService.hasPermission('Item Master', 'can_delete');
    this.loadItems();
  }

  loadItems() {
    this.loading = true;
    this.itemService.getItems().subscribe({
      next: (data) => {
        this.items = data;
        this.filterItems();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load items: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  filterItems() {
    if (!this.searchQuery.trim()) {
      this.filteredItems = [...this.items];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredItems = this.items.filter(i => 
        i.item_code.toLowerCase().includes(q) ||
        i.item_name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.brand?.toLowerCase().includes(q)
      );
    }
    this.currentPage = 1;
  }

  // Pagination
  currentPage = 1;
  pageSize = 20;

  get paginatedItems(): Item[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredItems.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredItems.length / this.pageSize);
  }

  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }

  updateItemSpec(item: Item) {
    if (!item.id) return;
    this.itemService.updateItem(item.id, { description: item.description }).subscribe({
      next: () => {
        this.success = `Specification for ${item.item_code} updated.`;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        this.error = 'Failed to update specification: ' + (err.error?.message || err.message);
        setTimeout(() => this.error = '', 3000);
      }
    });
  }

  deleteItem(id: number | undefined) {
    if (!id || !confirm('Are you sure you want to delete this item?')) return;

    this.itemService.deleteItem(id).subscribe({
      next: () => {
        this.success = 'Item deleted successfully.';
        this.loadItems();
      },
      error: (err) => {
        this.error = 'Failed to delete item: ' + (err.error?.message || err.message);
      }
    });
  }
}
