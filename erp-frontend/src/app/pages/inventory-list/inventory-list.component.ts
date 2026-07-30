import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, Stock, InventoryHistoryEntry } from '../../services/inventory.service';
import { ProjectService } from '../../services/project.service';

export interface StockCategory {
  categoryName: string;
  stocks: Stock[];
}

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.css']
})
export class InventoryListComponent implements OnInit {
  stocks: Stock[] = [];
  filteredStocks: Stock[] = [];
  paginatedStocks: Stock[] = [];

  // History Modal State
  showHistoryModal = false;
  selectedItemName = '';
  selectedItemCode = '';
  historyEntries: InventoryHistoryEntry[] = [];
  loadingHistory = false;
  searchQuery = '';
  locationFilter = '';
  projectFilter = '';
  uniqueLocations: string[] = [];
  uniqueProjects: string[] = [];
  loading = true;
  error = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;

  constructor(
    private inventoryService: InventoryService,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    this.loadProjects();
    this.loadStock();
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        const names = projects.map(p => p.project_name);
        this.uniqueProjects = Array.from(new Set(names)).sort();
      },
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  loadStock() {
    this.loading = true;
    this.inventoryService.getStockLevels().subscribe({
      next: (data) => {
        this.stocks = data;
        
        // Ensure standard warehouses are always visible, plus any other locations found in data
        const standardWarehouses = ['Warehouse', 'KINFRA', 'KSIDC', 'CDAC'];
        const dataLocations = data.map(s => s.location).filter(l => !!l) as string[];
        this.uniqueLocations = Array.from(new Set([...standardWarehouses, ...dataLocations])).sort();
        
        // Projects are handled by loadProjects(), but we can add any extras found in data just in case
        const dataProjects = data.map(s => (s as any).project_name).filter(p => !!p) as string[];
        if (dataProjects.length > 0) {
          this.uniqueProjects = Array.from(new Set([...this.uniqueProjects, ...dataProjects])).sort();
        }

        this.filterStock();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load inventory: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  filterStock() {
    let filtered = this.stocks;
    
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.Item?.item_name.toLowerCase().includes(q) ||
        s.Item?.item_code.toLowerCase().includes(q) ||
        (s.location || '').toLowerCase().includes(q) ||
        (s.Item?.category || '').toLowerCase().includes(q) ||
        (s.Item?.description || '').toLowerCase().includes(q)
      );
    }

    if (this.locationFilter) {
      filtered = filtered.filter(s => (s.location || 'Main Store') === this.locationFilter);
    }

    if (this.projectFilter) {
      filtered = filtered.filter(s => ((s as any).project_name || 'N/A') === this.projectFilter);
    }
    
    // Aggregate stock by item_id AND project AND location for the table view
    const aggregatedMap = new Map<string, Stock>();
    filtered.forEach(s => {
      const itemId = s.item_id;
      const project = (s as any).project_name || 'N/A';
      const loc = s.location || 'Main Store';
      const key = `${itemId}_${project}_${loc}`;
      
      if (!aggregatedMap.has(key)) {
        aggregatedMap.set(key, JSON.parse(JSON.stringify(s)));
      } else {
        const existing = aggregatedMap.get(key)!;
        existing.quantity = (parseFloat(existing.quantity as any) || 0) + (parseFloat(s.quantity as any) || 0);
        existing.bad_quantity = (parseFloat(existing.bad_quantity as any) || 0) + (parseFloat(s.bad_quantity as any) || 0);
      }
    });

    this.filteredStocks = Array.from(aggregatedMap.values()).sort((a, b) => {
      // Sort by Item ID (Product ID)
      const codeA = a.Item?.item_code || '';
      const codeB = b.Item?.item_code || '';
      return codeA.localeCompare(codeB);
    });

    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredStocks.length / this.itemsPerPage) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedStocks = this.filteredStocks.slice(startIndex, startIndex + this.itemsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  getStockStatus(qty: number): string {
    if (qty <= 0) return 'Out of Stock';
    if (qty < 10) return 'Low Stock';
    return 'In Stock';
  }

  getDisplayQuantity(qty: any): number {
    if (!qty) return 0;
    const numericQty = parseFloat(qty);
    if (isNaN(numericQty)) return 0;
    return numericQty < 0 ? 0 : numericQty;
  }

  getStatusClass(qty: number): string {
    if (qty <= 0) return 'status-out';
    if (qty < 10) return 'status-low';
    return 'status-in';
  }

  viewHistory(s: Stock) {
    this.selectedItemName = s.Item?.item_name || 'Unknown Item';
    this.selectedItemCode = s.Item?.item_code || 'N/A';
    this.showHistoryModal = true;
    this.loadingHistory = true;
    this.historyEntries = [];

    this.inventoryService.getItemHistory(s.item_id).subscribe({
      next: (history) => {
        this.historyEntries = history;
        this.loadingHistory = false;
      },
      error: (err) => {
        console.error('Failed to load item history', err);
        this.loadingHistory = false;
      }
    });
  }

  closeHistoryModal() {
    this.showHistoryModal = false;
    this.historyEntries = [];
  }

}
