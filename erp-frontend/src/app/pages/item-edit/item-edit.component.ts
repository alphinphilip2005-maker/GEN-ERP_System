import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ItemService, Item } from '../../services/item.service';
import { ItemCategoryService } from '../../services/item-category.service';
import { UomService } from '../../services/uom.service';

@Component({
  selector: 'app-item-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './item-edit.component.html',
  styleUrls: ['./item-edit.component.css']
})
export class ItemEditComponent implements OnInit {
  item: Item = {
    item_code: '',
    item_name: '',
    description: '',
    category: '',
    uom: '',
    brand: '',
    material: ''
  };

  id!: number;
  loading = true;
  submitting = false;
  error = '';
  success = '';
  codeExists = false;
  originalCode = '';

  categories: string[] = [];
  uoms: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private itemService: ItemService,
    private router: Router,
    private categoryService: ItemCategoryService,
    private uomService: UomService
  ) {}

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.categoryService.getCategories().subscribe({
      next: (cats) => this.categories = cats.map(c => c.name),
      error: () => this.categories = ['Uncategorized']
    });
    this.uomService.getUoms().subscribe({
      next: (u) => this.uoms = u.map(x => x.name),
      error: () => this.uoms = ['PCS']
    });
    if (this.id) {
      this.loadItem();
    } else {
      this.error = 'Invalid Item ID';
      this.loading = false;
    }
  }

  loadItem() {
    this.itemService.getItem(this.id).subscribe({
      next: (data) => {
        this.item = data;
        this.originalCode = data.item_code;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load item: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  checkCode() {
    if (!this.item.item_code || this.item.item_code === this.originalCode) {
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
        this.codeExists = false;
      }
    });
  }

  onSubmit() {
    this.submitting = true;
    this.error = '';
    this.success = '';

    this.itemService.updateItem(this.id, this.item).subscribe({
      next: () => {
        this.success = 'Item updated successfully! Redirecting...';
        setTimeout(() => this.router.navigate(['/admin/items']), 1500);
      },
      error: (err) => {
        this.error = 'Failed to update item: ' + (err.error?.message || err.message);
        this.submitting = false;
      }
    });
  }
}
