import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { PurchaseRequestService } from '../../services/purchase-request.service';
import { MrnService } from '../../services/mrn.service';
import { GrnService } from '../../services/grn.service';
import { PoService } from '../../services/po.service';
import { PaymentService } from '../../services/payment.service';
import { InventoryService } from '../../services/inventory.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser: any = null;
  today = new Date();
  totalUsers = 0;
  totalModules = 0;

  stats = [
    { label: 'Total Users', value: 0, icon: 'users', color: 'blue', trend: '+12%' },
    { label: 'ERP Modules', value: 11, icon: 'modules', color: 'purple', trend: 'Active' },
    { label: 'Pending Orders', value: 0, icon: 'orders', color: 'amber', trend: 'Review' },
    { label: 'GRN Entries', value: 0, icon: 'grn', color: 'green', trend: 'Today' }
  ];

  quickActions = [
    { label: 'Add New User', route: '/admin/users/create', icon: 'add-user', color: 'blue' },
    { label: 'View All Users', route: '/admin/users', icon: 'list', color: 'indigo' },
    { label: 'Purchase Request', route: '/admin/purchase-request', icon: 'pr', color: 'amber' },
    { label: 'Stock Inventory', route: '/admin/stock', icon: 'stock', color: 'green' },
    { label: 'Goods Receiving Notes', route: '/admin/grn', icon: 'grn', color: 'indigo' }
  ];

  // R&D Dashboard Data
  allPrs: any[] = [];
  filteredPrs: any[] = [];
  prSearchText: string = '';

  approvalStats = { open: 0, closed: 0, overdue: 0 };
  prStats = { open: 0, approved: 0, rejected: 0 };
  mrnStats = { open: 0, closed: 0, overdue: 0 };
  grnStats = { pending: 0, completed: 0, rejected: 0 };
  iqcStats = { pending: 0, partial: 0, completed: 0 };
  inventoryStats = { mechanical: 0, hardware: 0, electronics: 0, sensors: 0, total: 0 };

  constructor(
    private userService: UserService, 
    private authService: AuthService,
    private prService: PurchaseRequestService,
    private mrnService: MrnService,
    private grnService: GrnService,
    private poService: PoService,
    private paymentService: PaymentService,
    private inventoryService: InventoryService
  ) {}

  get isProductionUser(): boolean {
    if (!this.currentUser) return false;
    const dept = (this.currentUser.department || '').toLowerCase();
    const desig = (this.currentUser.designation || '').toLowerCase();
    const email = (this.currentUser.email || '').toLowerCase();
    const name = (this.currentUser.name || '').toLowerCase();
    return dept.includes('production') || desig.includes('production') || 
           email.includes('akhil') || name.includes('akhil');
  }

  get isStoreUser(): boolean {
    if (!this.currentUser) return false;
    const dept = (this.currentUser.department || '').toLowerCase();
    const desig = (this.currentUser.designation || '').toLowerCase();
    const name = (this.currentUser.name || '').toLowerCase();
    return dept.includes('store') || desig.includes('store') || name.includes('john');
  }

  get isPurchaseUser(): boolean {
    if (!this.currentUser) return false;
    const dept = (this.currentUser.department || '').toLowerCase();
    const desig = (this.currentUser.designation || '').toLowerCase();
    const name = (this.currentUser.name || '').toLowerCase();
    const email = (this.currentUser.email || '').toLowerCase();
    return dept.includes('purchase') || desig.includes('purchase') || 
           name.includes('airene') || name.includes('alex') || name.includes('messi') ||
           email.includes('airene') || email.includes('alex') || email.includes('messi');
  }

  get isFinanceUser(): boolean {
    if (!this.currentUser) return false;
    const dept = (this.currentUser.department || '').toLowerCase();
    const desig = (this.currentUser.designation || '').toLowerCase();
    const name = (this.currentUser.name || '').toLowerCase();
    const email = (this.currentUser.email || '').toLowerCase();
    return dept.includes('finance') || desig.includes('finance') || 
           name.includes('nirmal') || email.includes('nirmal') || 
           dept === 'finance' || desig === 'finance';
  }

  get isRnDUser(): boolean {
    if (!this.currentUser) return false;
    const dept = (this.currentUser.department || '').toUpperCase();
    const desig = (this.currentUser.designation || '').toUpperCase();
    const email = (this.currentUser.email || '').toLowerCase();
    return dept.includes('R&D') || desig.includes('R&D') || 
           email.includes('ashik') || email.includes('alphin');
  }

  get isQualityUser(): boolean {
    if (!this.currentUser) return false;
    const dept = (this.currentUser.department || '').toLowerCase();
    const desig = (this.currentUser.designation || '').toLowerCase();
    const email = (this.currentUser.email || '').toLowerCase();
    
    // Explicit department check is most reliable
    if (dept === 'quality') return true;
    
    // Fallbacks for specific people or designation keywords
    return desig.includes('qa') || desig.includes('qc') ||
           email.includes('adithya') || email.includes('mahadev') || email.includes('cimil');
  }

  get isOmUser(): boolean {
    if (!this.currentUser) return false;
    const dept = (this.currentUser.department || '').toLowerCase();
    const desig = (this.currentUser.designation || '').toLowerCase();
    const email = (this.currentUser.email || '').toLowerCase();
    return dept.includes('o&m') || dept.includes('om') || desig.includes('o&m') ||
           email.includes('nikitha');
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    
    if (this.isOmUser) {
      this.loadAdminPRsForOm();
    } else if (this.isRnDUser || this.isProductionUser || this.isStoreUser || this.isPurchaseUser || this.isFinanceUser) {
      this.loadRnDDashboard(); // Loads PRs and MRNs
      if (this.isStoreUser) {
        this.loadStoreGRNStats();
      }
      if (this.isPurchaseUser) {
        this.loadPurchaseDashboard();
      }
      if (this.isFinanceUser) {
        this.loadFinanceDashboard();
      }
    } else if (this.isQualityUser) {
      this.loadRnDDashboard(); // Load PRs for tracking
      this.loadQualityDashboard();
    } else {
      // Default / Admin view - Load everything for aggregate view
      this.loadStats();
      this.loadRnDDashboard(); // PRs and MRNs
      this.loadPurchaseDashboard(); // POs
      this.loadQualityDashboard(); // GRNs and IQC
    }
  }

  loadAdminPRsForOm() {
    // Fetch all ADMIN PRs for O&M user (Nikitha) to see the full PR tracking
    this.prService.getPurchaseRequests().subscribe({
      next: (prs: any[]) => {
        const filtered = prs.filter(pr => {
          const dept = (pr.department || '').toUpperCase();
          return dept.includes('ADMIN') || dept.includes('R&D') || dept.includes('O&M');
        });
        const sorted = [...prs].sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
        this.allPrs = sorted;
        this.filteredPrs = filtered.sort((a: any, b: any) => (b.id || 0) - (a.id || 0)).slice(0, 5);
        this.calculateRnDStats();
      },
      error: () => {}
    });
  }

  loadStats() {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.stats[0].value = users.length;
      },
      error: () => {}
    });
    this.userService.getModules().subscribe({
      next: (modules) => {
        this.stats[1].value = modules.length;
      },
      error: () => {}
    });
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  // --- R&D Head Methods ---
  loadRnDDashboard() {
    this.prService.getPurchaseRequests().subscribe({
      next: (prs: any[]) => {
        const filtered = prs.filter(pr => {
          // Robust check for central roles / admins to see all tracking data
          const userDept = (this.currentUser?.department || '').toLowerCase();
          const userName = (this.currentUser?.name || '').toLowerCase();
          const userRole = (this.currentUser?.role || '').toLowerCase();
          const isCentral = userRole === 'admin' || 
                            userDept.includes('finance') || userDept.includes('store') || 
                            userDept.includes('purchase') || userName.includes('nirmal') ||
                            userName.includes('john') || userName.includes('messi') ||
                            userDept.includes('accounts');
          
          if (isCentral) return true;
          
          const prDept = (pr.department || '').toUpperCase();
          return prDept.includes('R&D') || prDept.includes('ADMIN') || prDept.includes('PRODUCTION') || prDept.includes('QUALITY');
        });

        // Sort by id descending and take latest 5 for a clean dashboard view
        this.allPrs = [...prs].sort((a, b) => (b.id || 0) - (a.id || 0));
        this.filteredPrs = filtered.sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 5);
        this.calculateRnDStats();
      },
      error: () => {}
    });

    this.mrnService.getMrns(1, 1000).subscribe({
      next: (res: any) => {
        this.calculateMrnStats(res.data || []);
      }
    });
  }

  calculateRnDStats() {
    let appOpen = 0, appClosed = 0, appOverdue = 0;
    let prOpen = 0, prApproved = 0, prRejected = 0;

    const today = new Date();

    this.allPrs.forEach(pr => {
      // PR Status Logic
      if (['Draft', 'Submitted', 'OPEN'].includes(pr.status)) {
        prOpen++;
      } else if (pr.status === 'Rejected') {
        prRejected++;
      } else {
        prApproved++; // Counts as 'Approved' (includes 'Approved', 'Quoted', 'PO Generated', 'Completed', 'Closed', 'Fully Awarded', etc.)
      }

      // Approval Status Logic
      if (pr.status === 'Submitted') {
        const reqDate = new Date(pr.request_date);
        const diffDays = Math.floor((today.getTime() - reqDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays > 7) {
          appOverdue++;
        } else {
          appOpen++;
        }
      } else if (['Approved', 'Rejected', 'Completed', 'PO Generated'].includes(pr.status)) {
        appClosed++;
      }
    });

    this.approvalStats = { open: appOpen, closed: appClosed, overdue: appOverdue };
    this.prStats = { open: prOpen, approved: prApproved, rejected: prRejected };
  }

  get approvalDonutStyle() {
    const total = this.approvalStats.open + this.approvalStats.closed + this.approvalStats.overdue || 1;
    const pOpen = (this.approvalStats.open / total) * 100;
    const pClosed = (this.approvalStats.closed / total) * 100;
    
    return `conic-gradient(#003f7a 0% ${pOpen}%, #0ea5e9 ${pOpen}% ${pOpen + pClosed}%, #93c5fd ${pOpen + pClosed}% 100%)`;
  }

  get prDonutStyle() {
    const total = this.prStats.open + this.prStats.approved + this.prStats.rejected || 1;
    const pOpen = (this.prStats.open / total) * 100;
    const pApproved = (this.prStats.approved / total) * 100;
    const pRejected = (this.prStats.rejected / total) * 100;
    
    // Lighten shades: #fbbf24 -> #fcd34d (Amber-400), #16a34a -> #22c55e (Green-500), #ef4444 -> #f87171 (Red-400)
    return `conic-gradient(#fcd34d 0% ${pOpen}%, #22c55e ${pOpen}% ${pOpen + pApproved}%, #f87171 ${pOpen + pApproved}% 100%)`;
  }

  calculateMrnStats(mrns: any[]) {
    let pending = 0, approved = 0, issued = 0;

    mrns.forEach(m => {
      const s = m.status || '';
      if (s === 'Issued' || s === 'Fulfilled' || s === 'Closed') {
        issued++;
      } else if (s === 'Approved') {
        approved++;
      } else {
        pending++;
      }
    });
    this.mrnStats = { open: pending, closed: approved, overdue: issued }; // Mapping: open -> Pending, closed -> Approved, overdue -> Issued
  }

  get mrnDonutStyle() {
    const total = this.mrnStats.open + this.mrnStats.closed + this.mrnStats.overdue || 1;
    const pOpen = (this.mrnStats.open / total) * 100;
    const pClosed = (this.mrnStats.closed / total) * 100;
    const pOverdue = (this.mrnStats.overdue / total) * 100;

    // Use colors from request: Open (Dark Blue), Closed (Cyan/Teal), Overdue (Light Blue)
    return `conic-gradient(#003f7a 0% ${pOpen}%, #0ea5e9 ${pOpen}% ${pOpen + pClosed}%, #93c5fd ${pOpen + pClosed}% 100%)`;
  }

  filterPrs() {
    if (!this.prSearchText) {
      this.filteredPrs = this.allPrs.slice(0, 5);
    } else {
      const lower = this.prSearchText.toLowerCase();
      this.filteredPrs = this.allPrs.filter(pr => 
        (pr.pr_no && pr.pr_no.toLowerCase().includes(lower)) || 
        (pr.Project?.project_name && pr.Project.project_name.toLowerCase().includes(lower))
      ); // Removed slice to show all search results
    }
  }

  getVendorsForPr(pr: any): any[] {
    const vendorMap = new Map<string, any>();

    // 1. Check for actual Purchase Orders (PO Generated stage)
    if (pr.PurchaseOrders) {
      pr.PurchaseOrders.forEach((po: any) => {
        const vName = po.ToVendor?.vendor_name || po.ToVendor?.name || 'Vendor';
        const grns = po.Grns || [];
        
        // Correct aggregation logic for multiple GRNs
        const allFullyInspected = grns.length > 0 && grns.every((g: any) => ['Fully Inspected', 'Approved', 'QC Accepted'].includes(g.status));
        const hasAnyInspection = grns.some((g: any) => ['Fully Inspected', 'Approved', 'QC Accepted', 'Partially Inspected'].includes(g.status));
        
        let finalGrnStatus = null;
        if (grns.length > 0) {
          if (allFullyInspected) {
            finalGrnStatus = 'Fully Inspected';
          } else if (hasAnyInspection) {
            finalGrnStatus = 'Partially Inspected';
          } else {
            finalGrnStatus = 'QC Pending';
          }
        }

        if (!vendorMap.has(vName)) {
          vendorMap.set(vName, { 
            name: vName, 
            poStatus: po.status, 
            hasPo: true,
            grnStatus: finalGrnStatus
          });
        }
      });
    }

    // 2. Check for Quotes (Quote stage)
    if (pr.PurchaseRequestItems) {
      pr.PurchaseRequestItems.forEach((item: any) => {
        const quotes = item.Quotes || item.quotes || []; // Handle both cases
        if (quotes.length > 0) {
          quotes.forEach((q: any) => {
            if (q.status === 'Approved') {
              const vName = q.Vendor?.name || q.Vendor?.vendor_name || 'Vendor';
              if (!vendorMap.has(vName)) {
                vendorMap.set(vName, { 
                  name: vName, 
                  hasQuote: true, 
                  poStatus: null,
                  grnStatus: null 
                });
              }
              const vData = vendorMap.get(vName);
              vData.hasQuote = true;
            }
          });
        }
      });
    }

    if (vendorMap.size > 0) {
      return Array.from(vendorMap.values());
    }

    // Default fallback if no POs or vendors
    return [{ 
      name: pr.Project?.project_name || 'General Inventory', 
      poStatus: null
    }];
  }

  getStageStatus(pr: any, stage: string, vendorContext?: any): string {
    const poStatus = vendorContext?.poStatus;
    const hasPo = vendorContext?.hasPo;
    const hasQuote = vendorContext?.hasQuote;
    const prStatus = pr.status;
    
    // Global rejection check
    if (prStatus === 'Rejected') {
      if (stage === 'PR') return 'rejected';
      return 'pending';
    }

    // Helper to define if a given stage is completed
    const isStageCompleted = (s: string): boolean => {
      switch(s) {
        case 'PR': 
          return true; // PR is always raised if we are tracking it
        case 'Quote': 
          return ['Quoted', 'PO Generated', 'Completed', 'Dispatched', 'Delivered'].includes(prStatus) || !!(hasPo || hasQuote);
        case 'PO': 
          return !!(hasPo || ['PO Generated', 'Completed', 'Dispatched', 'Delivered'].includes(prStatus));
        case 'GRN': 
          return !!(vendorContext?.grnStatus) || ['Completed', 'Delivered'].includes(poStatus) || prStatus === 'Completed';
        case 'IQC': 
          return vendorContext?.grnStatus === 'Fully Inspected';
        case 'Inventory': 
          return vendorContext?.grnStatus === 'Fully Inspected';
        default: 
          return false;
      }
    };

    // Check specific failure states
    if (stage === 'PO' && poStatus === 'Rejected') return 'rejected';

    // If stage is completed, return 'completed'
    if (isStageCompleted(stage)) {
      return 'completed';
    }

    // Find current active step (the first not completed)
    const stages = ['PR', 'Quote', 'PO', 'GRN', 'IQC', 'Inventory'];
    let activeStage = '';
    for (const s of stages) {
      if (!isStageCompleted(s)) {
        activeStage = s;
        break;
      }
    }

    if (stage === activeStage) {
      return 'active'; // Styled as prominent blue ("pending completion")
    }

    // SPECIAL CASE: If IQC is Partially Inspected, BOTH IQC and Inventory should be active (Blue)!
    if (vendorContext?.grnStatus === 'Partially Inspected' && activeStage === 'IQC' && stage === 'Inventory') {
      return 'active';
    }

    return 'pending'; // Upcoming / Future steps
  }

  getStageReason(pr: any, stage: string, vendorContext?: any): string {
    const s = vendorContext?.poStatus || pr.status;
    const status = this.getStageStatus(pr, stage, vendorContext);

    // 1. Active / Awaiting Action State
    if (status === 'active') {
      const grnStatus = vendorContext?.grnStatus;
      switch(stage) {
        case 'Quote': return 'Awaiting vendor quotes';
        case 'PO': return 'Ready for PO generation';
        case 'GRN': return 'Ready for GRN generation';
        case 'IQC': 
          if (grnStatus === 'Partially Inspected') {
            return 'Quality Inspection Underway (Partial Consignment)';
          }
          return 'Pending Quality Assurance review';
        case 'Inventory': 
          if (grnStatus === 'Partially Inspected') {
            return 'Partial Inventory Update in Progress';
          }
          return 'Awaiting stock registration';
        default: return '';
      }
    }

    // 2. Rejected / Fail State
    if (status === 'rejected') {
      if (stage === 'PR') return 'Request rejected by management';
      if (stage === 'PO') return 'Purchase Order rejected';
      return 'Rejected';
    }

    // 3. Completed State
    if (status === 'completed') {
      switch(stage) {
        case 'PR': return 'Request raised successfully';
        case 'Quote': return 'Vendors quoted';
        case 'PO': 
          if (s === 'Dispatched') return 'Item dispatched by vendor';
          if (s === 'Delivered') return 'Item delivered to warehouse';
          return 'PO generated and sent';
        case 'GRN': return 'Goods consignment verified & cleared';
        case 'IQC': return 'Quality standards successfully validated';
        case 'Inventory': return 'Inventory optimized & records updated';
        default: return '';
      }
    }

    // 4. Future inactive states remain empty
    return '';
  }

  // --- Quality Methods ---
  loadQualityDashboard() {
    this.grnService.getGrns().subscribe({
      next: (grns: any[]) => {
        this.calculateQualityStats(grns);
      }
    });
  }

  calculateQualityStats(grns: any[]) {
    let grnFully = 0;
    let grnPartial = 0;

    let qcPending = 0;
    let qcPartial = 0;
    let qcFull = 0;

    grns.forEach(g => {
      const s = g.status || '';
      
      // GRN Lifecycle Stats (User requested only 2 labels: Fully Received, Partial Received)
      if (s === 'Approved' || s === 'Fully Inspected' || s === 'QC Accepted') {
        grnFully++;
      } else {
        grnPartial++;
      }

      // IQC Status Stats
      if (s === 'QC Pending' || s === 'Created' || s === 'OPEN') {
        qcPending++;
      } else if (s === 'Partially Inspected') {
        qcPartial++;
      } else if (s === 'Fully Inspected' || s === 'Approved' || s === 'QC Accepted') {
        qcFull++;
      }
    });

    this.grnStats = { pending: grnFully, completed: grnPartial, rejected: 0 };
    this.iqcStats = { pending: qcPending, partial: qcPartial, completed: qcFull };
  }

  get grnDonutStyle() {
    const total = this.grnStats.pending + this.grnStats.completed + this.grnStats.rejected || 1;
    const pPending = (this.grnStats.pending / total) * 100;
    const pCompleted = (this.grnStats.completed / total) * 100;
    
    return `conic-gradient(#003f7a 0% ${pPending}%, #0ea5e9 ${pPending}% ${pPending + pCompleted}%, #f87171 ${pPending + pCompleted}% 100%)`;
  }

  get iqcDonutStyle() {
    const total = this.iqcStats.pending + this.iqcStats.partial + this.iqcStats.completed || 1;
    const pPending = (this.iqcStats.pending / total) * 100;
    const pPartial = (this.iqcStats.partial / total) * 100;
    const pCompleted = (this.iqcStats.completed / total) * 100;

    // Professional IQC Colors: Indigo-800, Violet-500, Sky-300
    return `conic-gradient(#3730a3 0% ${pPending}%, #8b5cf6 ${pPending}% ${pPending + pPartial}%, #7dd3fc ${pPending + pPartial}% 100%)`;
  }

  loadStoreGRNStats() {
    this.grnService.getGrns().subscribe({
      next: (grns: any[]) => {
        let pending = 0;
        let completed = 0;
        let overdue = 0;
        const today = new Date();

        grns.forEach(g => {
          const s = g.status || '';
          if (s === 'Approved' || s === 'Fully Inspected' || s === 'QC Accepted') {
            completed++;
          } else {
            const createdAt = new Date(g.created_at);
            const diffDays = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 3600 * 24));
            if (diffDays > 5) {
              overdue++;
            } else {
              pending++;
            }
          }
        });
        this.grnStats = { pending, completed, rejected: overdue }; 
      }
    });
  }

  loadPurchaseDashboard() {
    this.poService.getPurchaseOrders().subscribe({
      next: (pos: any[]) => {
        let open = 0;
        let approved = 0;
        pos.forEach(p => {
          if (p.is_approved || p.status === 'APPROVED' || p.status === 'CLOSED' || p.status === 'FULLY RECEIVED') {
            approved++;
          } else {
            open++;
          }
        });
        this.poStats = { open, approved };
      }
    });
  }

  poStats = { open: 0, approved: 0 };
  get poDonutStyle() {
    const total = this.poStats.open + this.poStats.approved || 1;
    const pOpen = (this.poStats.open / total) * 100;
    return `conic-gradient(#fcd34d 0% ${pOpen}%, #22c55e ${pOpen}% 100%)`;
  }

  paymentStats = { completed: 0, pending: 0 };
  get paymentDonutStyle() {
    const total = this.paymentStats.completed + this.paymentStats.pending || 1;
    const pCompleted = (this.paymentStats.completed / total) * 100;
    return `conic-gradient(#22c55e 0% ${pCompleted}%, #fcd34d ${pCompleted}% 100%)`;
  }

  loadFinanceDashboard() {
    this.paymentService.getPayments().subscribe({
      next: (payments: any[]) => {
        let completed = 0;
        let pending = 0;
        payments.forEach(p => {
          if (p.status === 'CLOSED') completed++;
          else pending++;
        });
        this.paymentStats = { completed, pending };
      }
    });
  }

  loadInventoryStats() {
    this.inventoryService.getStockLevels().subscribe({
      next: (stocks: any[]) => {
        let mech = 0, hard = 0, elec = 0, sens = 0, total = 0;
        stocks.forEach(s => {
          const cat = (s.Item?.category || '').toLowerCase();
          const qty = parseFloat(s.quantity || 0);
          total += qty;
          if (cat.includes('mechanical')) mech += qty;
          else if (cat.includes('hardware')) hard += qty;
          else if (cat.includes('electronics')) elec += qty;
          else if (cat.includes('sensor')) sens += qty;
        });
        this.inventoryStats = { 
          mechanical: Math.round(mech), 
          hardware: Math.round(hard), 
          electronics: Math.round(elec), 
          sensors: Math.round(sens),
          total: Math.round(total)
        };
      }
    });
  }

  get inventoryDonutStyle() {
    const total = this.inventoryStats.total || 1;
    const pMech = (this.inventoryStats.mechanical / total) * 100;
    const pHard = (this.inventoryStats.hardware / total) * 100;
    const pElec = (this.inventoryStats.electronics / total) * 100;
    const pSens = (this.inventoryStats.sensors / total) * 100;

    // Premium Inventory Colors: Emerald-400, Sky-500, Blue-600, Green-500
    return `conic-gradient(#34d399 0% ${pElec}%, #0ea5e9 ${pElec}% ${pElec + pHard}%, #2563eb ${pElec + pHard}% ${pElec + pHard + pMech}%, #22c55e ${pElec + pHard + pMech}% 100%)`;
  }
}
