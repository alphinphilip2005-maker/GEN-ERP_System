import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { GrnService } from '../../services/grn.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-iqc-inspect',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './iqc-inspect.component.html',
  styleUrls: ['./iqc-inspect.component.css']
})
export class IqcInspectComponent implements OnInit {
  grnId: string | null = null;
  grnData: any = null;
  
  selectedItem: any = null;
  currentUser: any = null;
  isViewMode: boolean = false;
  showModal: boolean = false;

  // Pagination
  iqcPage = 1;
  iqcPageSize = 12;

  get totalIqcPages(): number {
    return Math.ceil((this.grnData?.GrnItems?.length || 0) / this.iqcPageSize);
  }

  get paginatedIqcItems(): any[] {
    const start = (this.iqcPage - 1) * this.iqcPageSize;
    return (this.grnData?.GrnItems || []).slice(start, start + this.iqcPageSize);
  }

  getIqcGlobalIndex(i: number): number {
    return (this.iqcPage - 1) * this.iqcPageSize + i + 1;
  }

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private grnService: GrnService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    // Redirect if not Quality or Admin
    if (this.currentUser?.role !== 'admin' && this.currentUser?.department !== 'Quality') {
      alert('Access Denied: Only Quality department can access this module.');
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    this.route.paramMap.subscribe(params => {
      this.grnId = params.get('id');
      if (this.grnId) {
        this.fetchGrn();
      }
    });

    this.route.queryParams.subscribe(params => {
      this.isViewMode = params['view'] === 'true';
    });
  }

  fetchGrn() {
    this.grnService.getGrnById(this.grnId as string).subscribe({
      next: (data) => {
        this.grnData = data;
        if(this.grnData && this.grnData.GrnItems && this.grnData.GrnItems.length > 0) {
          // Exclude items with zero received quantity — nothing to inspect
          this.grnData.GrnItems = this.grnData.GrnItems.filter((i: any) => Number(i.received_qty) > 0);

          // Initialize QC fields if empty
          this.grnData.GrnItems.forEach((i: any) => {
             i.accepted_qty = i.accepted_qty != null ? i.accepted_qty : null;
             i.rejected_qty = i.rejected_qty || 0;
             i.qc_status = i.qc_status || 'Pending';
             i.rejection_reason = i.rejection_reason || '';
             // specific fields for the user's detailed form
             i.inspected_by = i.inspected_by || this.currentUser?.name || '';
             i.inspected_date = i.inspected_date || new Date().toISOString().substring(0, 10);
          });
          this.selectedItem = this.grnData.GrnItems[0] || null;
          this.showModal = false;
          this.iqcPage = 1; // reset pagination on load
        }
      },
      error: (err) => console.error('Failed to load GRN for IQC', err)
    });
  }

  selectItem(item: any) {
    this.selectedItem = item;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  openFile(url: string) {
    if (url) {
      window.open(url, '_blank');
    }
  }

  updateQcQty(item: any, type: 'accept'|'reject') {
    const acc = Number(item.accepted_qty) || 0;
    const rej = Number(item.rejected_qty) || 0;
    const totalInspected = acc + rej;
    const received = Number(item.received_qty) || 0;

    if (totalInspected > received) {
      alert(`Total inspected quantity (${totalInspected}) cannot exceed received quantity (${received}).`);
      if (type === 'accept') {
        item.accepted_qty = received - rej;
      } else {
        item.rejected_qty = received - acc;
      }
    }

    const newAcc = Number(item.accepted_qty) || 0;
    const newRej = Number(item.rejected_qty) || 0;
    const newTotal = newAcc + newRej;

    if (newTotal === 0) {
      item.qc_status = 'Pending';
    } else if (newTotal < received) {
      item.qc_status = 'Partially Inspected';
    } else {
      item.qc_status = 'Fully Inspected';
    }
  }

  setStatus(status: string) {
    if(this.selectedItem) {
      this.selectedItem.qc_status = status;
    }
  }

  onFileUpload(event: any, type: 'image' | 'video') {
    const file = event.target.files[0];
    if (!file) return;

    // Size validation
    const fileSizeInBytes = file.size;
    
    if (type === 'image') {
      const minSize = 100 * 1024; // 100KB
      const maxSize = 500 * 1024; // 500KB
      if (fileSizeInBytes < minSize || fileSizeInBytes > maxSize) {
        alert(`Image size must be between 100KB and 500KB. Current size: ${(fileSizeInBytes / 1024).toFixed(2)}KB`);
        event.target.value = '';
        return;
      }
    } else if (type === 'video') {
      const minSize = 20 * 1024 * 1024; // 20MB
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (fileSizeInBytes < minSize || fileSizeInBytes > maxSize) {
        alert(`Video size must be between 20MB and 50MB. Current size: ${(fileSizeInBytes / (1024 * 1024)).toFixed(2)}MB`);
        event.target.value = '';
        return;
      }
    }

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<any>('http://localhost:3000/api/upload', formData).subscribe({
      next: (res) => {
        if (type === 'image') {
          this.selectedItem.rejection_images = res.url;
        } else {
          this.selectedItem.rejection_video = res.url;
        }
        alert(type.charAt(0).toUpperCase() + type.slice(1) + ' uploaded successfully!');
      },
      error: (err) => {
        console.error(err);
        alert('Failed to upload ' + type);
      }
    });
  }

  saveQC() {
    const payload = {
      items: this.grnData.GrnItems.map((i: any) => ({
        id: i.id,
        qc_status: i.qc_status || 'Pending',
        accepted_qty: i.accepted_qty || 0,
        rejected_qty: i.rejected_qty || 0,
        rejection_reason: i.rejection_reason,
        rejection_images: i.rejection_images,
        rejection_video: i.rejection_video,
        inspected_by: i.inspected_by,
        inspected_date: i.inspected_date
      }))
    };
    
    this.grnService.updateQc(this.grnId as string, payload).subscribe({
      next: (res) => {
        alert('IQC Inspection Completed Successfully. Notifications sent to Store and Purchase teams.');
        this.router.navigate(['/admin/iqc']);
      },
      error: (err) => alert('Failed to save IQC details')
    });
  }
}
