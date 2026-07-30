import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { GrnService } from '../../services/grn.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-grn-create',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './grn-create.component.html',
  styleUrls: ['./grn-create.component.css']
})
export class GrnCreateComponent implements OnInit {
  allPos: any[] = [];
  selectedPo: any = null;
  isEditMode: boolean = false;
  editId: string | null = null;
  
  projects: string[] = [];
  selectedProjectFilter: string = '';
  filteredPos: any[] = [];
  
  grnData = {
    grn_no: 'AUTO-GEN',
    po_id: '',
    grn_date: new Date().toISOString().substring(0, 10),
    warehouse: '',
    project_id: '',
    remarks: '',
    vendor_name: '',
    po_date: '',
    bill_url: null as string | null,
    items: [] as any[]
  };

  // Pagination
  currentPage = 1;
  itemsPerPage = 12;

  get totalPages(): number {
    return Math.ceil(this.grnData.items.length / this.itemsPerPage);
  }

  get paginatedItems(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.grnData.items.slice(start, start + this.itemsPerPage);
  }

  getGlobalIndex(indexOnPage: number): number {
    return (this.currentPage - 1) * this.itemsPerPage + indexOnPage;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  viewFile(url: string | null): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  constructor(
    private grnService: GrnService, 
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.fetchPOs();
    
    // Check for Edit Mode
    this.route.paramMap.subscribe(params => {
      this.editId = params.get('id');
      if (this.editId) {
        this.isEditMode = true;
        this.loadGrnData(this.editId);
      } else {
        this.grnData.grn_no = 'GRN-' + Math.floor(1000 + Math.random() * 9000);
      }
    });
  }

  fetchPOs(): void {
    this.grnService.getAllPurchaseOrders().subscribe({
      next: (data) => {
        // filter out full completed POs if needed, for now just show all Pending
        this.allPos = data;
        this.applyProjectFilter();
        
        const projSet = new Set<string>();
        this.allPos.forEach(po => {
          const pName = po.project_name || po.PurchaseRequest?.Project?.project_name || 'General';
          projSet.add(pName);
        });
        this.projects = Array.from(projSet).sort();
        
        this.applyProjectFilter();
        
        // Handle query param for pre-selection
        this.route.queryParams.subscribe(q => {
          if (q['project']) {
            this.selectedProjectFilter = q['project'];
            this.applyProjectFilter();
          }
        });
      },
      error: (err) => console.error(err)
    });
  }

  applyProjectFilter(): void {
    const filteredByStatus = this.allPos.filter((po: any) => {
      const isSelected = this.isEditMode && po.id == this.grnData.po_id;
      const isReceived = po.status === 'ITEM RECEIVED' || po.status === 'PARTIALLY RECEIVED' || po.status === 'Returned shipment received';
      
      // Calculate remaining items
      let hasRemainingItems = false;
      if (po.Items && po.Items.length > 0) {
        hasRemainingItems = po.Items.some((item: any) => {
          let alreadyReceived = 0;
          if (po.Grns) {
            po.Grns.forEach((grn: any) => {
              const grnItem = grn.GrnItems?.find((gi: any) => gi.item_id === item.item_id);
              if (grnItem) {
                // If it's a returned shipment, we only count 'Accepted' items as already received
                // This allows re-receiving the rejected (returned) quantity
                if (po.status === 'Returned shipment received') {
                  alreadyReceived += Number(grnItem.accepted_qty || 0);
                } else {
                  alreadyReceived += Number(grnItem.received_qty || 0);
                }
              }
            });
          }
          return Number(item.quantity) - alreadyReceived > 0;
        });
      }

      return isSelected || (isReceived && hasRemainingItems);
    });

    if (!this.selectedProjectFilter) {
      this.filteredPos = filteredByStatus;
    } else {
      this.filteredPos = filteredByStatus.filter(po => {
        const pName = po.project_name || po.PurchaseRequest?.Project?.project_name || 'General';
        return pName === this.selectedProjectFilter;
      });
    }
    
    // Update projects list for filter dropdown if not in edit mode
    if (!this.isEditMode) {
        const projSet = new Set<string>();
        this.allPos.forEach(po => {
          const pName = po.project_name || po.PurchaseRequest?.Project?.project_name || 'General';
          projSet.add(pName);
        });
        this.projects = Array.from(projSet).sort();
    }
  }

  loadGrnData(id: string): void {
    this.grnService.getGrnById(id).subscribe({
      next: (data) => {
        // Check if IQC has started
        const isInspected = data.GrnItems?.some((gi: any) => gi.qc_status && gi.qc_status !== 'Pending');
        if (isInspected) {
          alert('IQC is already in progress or completed for this GRN. You can only view the details.');
          this.router.navigate(['/admin/grn', id]);
          return;
        }

        this.grnData = {
          grn_no: data.grn_no,
          po_id: data.po_id,
          grn_date: new Date(data.grn_date).toISOString().substring(0, 10),
          warehouse: data.warehouse || '',
          project_id: data.PurchaseOrder?.PurchaseRequest?.Project?.project_code || data.PurchaseOrder?.project_name || '',
          remarks: data.remarks || '',
          vendor_name: data.PurchaseOrder?.ToVendor?.name || '',
          po_date: data.PurchaseOrder?.po_date ? new Date(data.PurchaseOrder.po_date).toISOString().substring(0, 10) : '',
          bill_url: data.GrnItems?.find((gi: any) => gi.bill_url)?.bill_url || null,
          items: data.GrnItems.map((gi: any) => ({
            id: gi.id,
            item_id: gi.item_id,
            item_name: gi.Item?.item_name || '',
            item_code: gi.Item?.item_code || '',
            description: gi.Item?.description || '',
            uom: gi.Item?.uom || 'Nos',
            ordered_qty: gi.ordered_qty,
            received_qty: gi.received_qty,
            bill_url: gi.bill_url || null,
            qc_status: gi.qc_status,
            remarks: gi.remarks || '',
            accepted_qty: gi.accepted_qty,
            rejected_qty: gi.rejected_qty,
            rejection_reason: gi.rejection_reason
          }))
        };
        this.selectedPo = data.PurchaseOrder;
        this.applyProjectFilter();
      },
      error: (err) => console.error('Failed to load GRN', err)
    });
  }

  onPoChange(event: any): void {
    const poId = event.target.value;
    
    // Fetch full PO details including items
    this.grnService.getPurchaseOrderById(poId).subscribe({
      next: (fullPo) => {
        this.selectedPo = fullPo;
        if(this.selectedPo) {
          this.grnData.vendor_name = this.selectedPo.ToVendor?.name || '';
          this.grnData.po_date = this.selectedPo.po_date ? new Date(this.selectedPo.po_date).toISOString().substring(0, 10) : '';
          this.grnData.project_id = this.selectedPo.project_name || this.selectedPo.PurchaseRequest?.project_id || '';
          this.grnData.warehouse = this.selectedPo.warehouse || '';
          
          // Auto fetch items and calculate remaining quantities
          this.grnData.items = this.selectedPo.Items ? this.selectedPo.Items.map((item: any) => {
            // Calculate how much has already been received across all previous GRNs for this PO
            let alreadyReceived = 0;
            if (this.selectedPo.Grns) {
              this.selectedPo.Grns.forEach((grn: any) => {
                const grnItem = grn.GrnItems?.find((gi: any) => gi.item_id === item.item_id);
                if (grnItem) {
                  if (this.selectedPo.status === 'Returned shipment received') {
                    alreadyReceived += Number(grnItem.accepted_qty || 0);
                  } else {
                    alreadyReceived += Number(grnItem.received_qty || 0);
                  }
                }
              });
            }

            const remainingQty = Math.max(0, Number(item.quantity) - alreadyReceived);

            return {
              item_id: item.item_id,
              item_name: item.Item.item_name,
              item_code: item.Item.item_code,
              description: item.Item.description || '',
              uom: item.uom || item.Item.uom || 'Nos',
              ordered_qty: remainingQty, // This is what is yet to be received
              total_ordered_qty: item.quantity, // Keep track of the original PO quantity
              already_received: alreadyReceived,
              received_qty: null, // Let user fill it manually as requested
              location: this.selectedPo.warehouse || '',
              remarks: ''
            };
          }).filter((itm: any) => itm.ordered_qty > 0) : []; // Only show items that have something left to receive
        } else {
          this.grnData.items = [];
        }
      },
      error: (err) => {
        console.error('Error fetching PO details:', err);
        this.grnData.items = [];
      }
    });
  }

  onOverallBillUpload(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.grnService.uploadFile(file).subscribe({
        next: (res) => {
          this.grnData.bill_url = res.url;
          this.grnData.items.forEach(itm => itm.bill_url = res.url);
        },
        error: (err) => {
          console.error(err);
          alert('Failed to upload bill');
        }
      });
    }
  }

  onSubmit(): void {
    if (!this.grnData.po_id) {
      alert('Please select a PO.');
      return;
    }

    // validate quantities
    for(let i of this.grnData.items) {
      if(i.received_qty === null || i.received_qty === undefined || i.received_qty === '') {
        i.received_qty = 0;
      }
      if(i.received_qty < 0) {
        alert('Received quantity cannot be negative for ' + i.item_name);
        return;
      }
      if(i.received_qty > i.ordered_qty) {
        alert('Received quantity cannot exceed Ordered quantity for ' + i.item_name);
        return;
      }
    }

    // Propagate the overall bill_url to all items before saving
    for (let i of this.grnData.items) {
      i.bill_url = this.grnData.bill_url;
    }

    const obs = this.isEditMode 
      ? this.grnService.updateGrn(this.editId!, this.grnData)
      : this.grnService.createGrn(this.grnData);

    obs.subscribe({
      next: () => {
        alert(this.isEditMode ? 'GRN Updated successfully' : 'GRN Created successfully');
        this.router.navigate(['/admin/grn']);
      },
      error: (err) => {
        console.error(err);
        alert('Error saving GRN');
      }
    });
  }
}
