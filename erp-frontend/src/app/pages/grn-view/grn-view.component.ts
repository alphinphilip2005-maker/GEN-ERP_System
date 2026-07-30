import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { GrnService } from '../../services/grn.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-grn-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './grn-view.component.html',
  styleUrls: ['./grn-view.component.css']
})
export class GrnViewComponent implements OnInit {
  grnId: string | null = null;
  grnData: any = null;
  
  selectedItem: any = null;
  isQCMode: boolean = false;

  // Pagination
  viewPage = 1;
  viewPageSize = 12;

  get totalViewPages(): number {
    return Math.ceil((this.grnData?.GrnItems?.length || 0) / this.viewPageSize);
  }

  get paginatedViewItems(): any[] {
    const start = (this.viewPage - 1) * this.viewPageSize;
    return (this.grnData?.GrnItems || []).slice(start, start + this.viewPageSize);
  }

  getViewGlobalIndex(i: number): number {
    return (this.viewPage - 1) * this.viewPageSize + i + 1;
  }

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private grnService: GrnService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.grnId = params.get('id');
      if (this.grnId) {
        this.fetchGrn();
      }
    });

    // GRN View is strictly for viewing results. QC is performed in the IQC module.
    this.isQCMode = false;
  }

  fetchGrn() {
    this.grnService.getGrnById(this.grnId as string).subscribe({
      next: (data) => {
        this.grnData = data;
        if (this.grnData?.GrnItems?.length > 0) {
          this.selectedItem = this.grnData.GrnItems[0];
          this.viewPage = 1;
        }
      },
      error: (err) => console.error(err)
    });
  }

  selectItemForQC(item: any) {
    this.selectedItem = item;
  }

  openFile(url: string) {
    if (url) {
      window.open(url, '_blank');
    }
  }

  updateQcQty(item: any, type: 'accept'|'reject') {
    if(type === 'accept') {
      item.rejected_qty = item.received_qty - item.accepted_qty;
    } else {
      item.accepted_qty = item.received_qty - item.rejected_qty;
    }
  }

  setStatus(status: string) {
    if(this.selectedItem) {
      this.selectedItem.qc_status = status;
    }
  }

  saveQC() {
    // Collect all items Data
    const payload = {
      items: this.grnData.GrnItems.map((i: any) => ({
        id: i.id,
        qc_status: i.qc_status,
        accepted_qty: i.accepted_qty,
        rejected_qty: i.rejected_qty,
        rejection_reason: i.rejection_reason
      }))
    };
    
    this.grnService.updateQc(this.grnId as string, payload).subscribe({
      next: (res) => {
        alert('QC Updated Successfully');
        this.fetchGrn(); // refresh data
      },
      error: (err) => alert('Failed to update QC')
    });
  }
}
