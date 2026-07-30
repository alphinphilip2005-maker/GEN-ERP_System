import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ItemService, Item } from '../../services/item.service';
import { ItemCategoryService } from '../../services/item-category.service';
import { UomService } from '../../services/uom.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-item-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './item-create.component.html',
  styleUrls: ['./item-create.component.css']
})
export class ItemCreateComponent implements OnInit {
  item: Item = {
    item_code: '',
    item_name: '',
    description: '',
    category: '',
    uom: '',
    brand: '',
    material: ''
  };

  selectedFile: File | null = null;
  submitting = false;
  uploading = false;
  error = '';
  success = '';
  codeExists = false;

  categories: string[] = [];
  uoms: string[] = [];

  constructor(
    private itemService: ItemService, 
    private router: Router, 
    private categoryService: ItemCategoryService,
    private uomService: UomService
  ) {}

  ngOnInit() {
    this.categoryService.getCategories().subscribe({
      next: (cats) => this.categories = cats.map(c => c.name),
      error: () => this.categories = ['Uncategorized']
    });
    this.uomService.getUoms().subscribe({
      next: (u) => this.uoms = u.map(x => x.name),
      error: () => this.uoms = ['PCS']
    });
  }

  checkCode() {
    if (!this.item.item_code) {
      this.codeExists = false;
      return;
    }

    this.itemService.checkDuplicateCode(this.item.item_code).subscribe({
      next: (res) => {
        this.codeExists = res.exists;
        if (this.codeExists) {
          this.error = 'Warning: This Item Code already exists in the system.';
        } else if (this.error === 'Warning: This Item Code already exists in the system.') {
          this.error = '';
        }
      },
      error: () => {
        // Silently fail or log
        this.codeExists = false;
      }
    });
  }


  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onSubmit() {
    this.submitting = true;
    this.error = '';
    this.success = '';

    this.itemService.createItem(this.item).subscribe({
      next: () => {
        this.success = 'Item created successfully! Redirecting...';
        setTimeout(() => this.router.navigate(['/admin/items']), 1500);
      },
      error: (err) => {
        this.error = 'Failed to create item: ' + (err.error?.message || err.message);
        this.submitting = false;
      }
    });
  }

  onUpload() {
    if (!this.selectedFile) {
      this.error = 'Please select an Excel file first.';
      return;
    }

    this.uploading = true;
    this.error = '';
    this.success = '';

    this.itemService.uploadExcel(this.selectedFile).subscribe({
      next: (res) => {
        let msg = `${res.added} items successfully imported.`;
        if (res.skipped > 0) {
          const allDupes = [...(res.internalDuplicates || []), ...(res.systemDuplicates || [])].sort((a, b) => a - b);
          msg += ` ${res.skipped} duplicates skipped at rows: ${allDupes.join(', ')}.`;
        }
        
        this.success = msg;
        this.uploading = false;
        if (res.added > 0) {
          setTimeout(() => this.router.navigate(['/admin/items']), 3000);
        }
      },
      error: (err) => {
        this.error = 'Upload failed: ' + (err.error?.message || err.message);
        this.uploading = false;
      }
    });

  }

  downloadTemplate() {
    const headers = [['Item Code', 'Item Name', 'Description', 'Category', 'UOM', 'Brand', 'Material']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'item_master_template.xlsx');
  }
}
