import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { PurchaseRequestService } from '../../services/purchase-request.service';

@Component({
  selector: 'app-quotation-analysis',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './quotation-analysis.component.html',
  styleUrls: ['./quotation-analysis.component.css']
})
export class QuotationAnalysisComponent implements OnInit {
  pr: any = null;
  loading = true;
  analysisItems: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private prService: PurchaseRequestService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAnalysis(Number(id));
    }
  }

  loadAnalysis(id: number) {
    this.loading = true;
    this.prService.getPurchaseRequest(id).subscribe({
      next: (data) => {
        this.pr = data;
        this.processAnalysis();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading analysis:', err);
        this.loading = false;
      }
    });
  }

  processAnalysis() {
    this.analysisItems = [];
    if (!this.pr.PurchaseRequestItems) return;

    this.analysisItems = this.pr.PurchaseRequestItems.map((item: any) => {
      const itemName = item.Item?.item_name || item.custom_item_name || `Item #${item.item_id}`;
      const itemCode = item.Item?.item_code || 'N/A';
      
      const quotes = (item.Quotes || []).map((q: any) => ({
        vendorName: q.Vendor?.name || 'Unknown',
        price: q.price,
        delivery: q.delivery_time,
        status: q.status,
        isAwarded: q.status === 'Approved'
      }));

      // Sort quotes within item: Awarded first, then price low to high
      quotes.sort((a: any, b: any) => {
        if (a.isAwarded) return -1;
        if (b.isAwarded) return 1;
        return a.price - b.price;
      });

      return {
        itemName,
        itemCode,
        uom: item.Item?.uom || 'PCS',
        quantity: item.quantity,
        quotes: quotes.length > 0 ? quotes : [{
          vendorName: 'NO QUOTES RECEIVED',
          price: 0,
          delivery: 'N/A',
          status: 'Missing',
          isAwarded: false
        }]
      };
    });
  }

  getPrQuotationStatus(): string {
    if (!this.pr?.PurchaseRequestItems) return 'none';
    const total = this.pr.PurchaseRequestItems.length;
    const awarded = this.pr.PurchaseRequestItems.filter((i: any) => 
      i.Quotes?.some((q: any) => q.status === 'Approved')
    ).length;
    
    if (awarded === total) return 'complete';
    if (awarded > 0) return 'partial';
    return 'pending';
  }

  goBack() {
    this.router.navigate(['/admin/quotation-management']);
  }
}
