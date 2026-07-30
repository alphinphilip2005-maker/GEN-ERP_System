import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/user-list/user-list.component').then(m => m.UserListComponent)
      },
      {
        path: 'users/create',
        loadComponent: () => import('./pages/user-create/user-create.component').then(m => m.UserCreateComponent)
      },
      {
        path: 'users/:id/edit',
        loadComponent: () => import('./pages/user-edit/user-edit.component').then(m => m.UserEditComponent)
      },
      {
        path: 'items',
        loadComponent: () => import('./pages/item-list/item-list.component').then(m => m.ItemListComponent)
      },
      {
        path: 'items/create',
        loadComponent: () => import('./pages/item-create/item-create.component').then(m => m.ItemCreateComponent)
      },
      {
        path: 'items/:id/edit',
        loadComponent: () => import('./pages/item-edit/item-edit.component').then(m => m.ItemEditComponent)
      },
      {
        path: 'item-categories',
        loadComponent: () => import('./pages/item-category-list/item-category-list.component').then(m => m.ItemCategoryListComponent)
      },
      {
        path: 'uom',
        loadComponent: () => import('./pages/uom-list/uom-list.component').then(m => m.UomListComponent)
      },
      {
        path: 'projects',
        loadComponent: () => import('./pages/project-list/project-list.component').then(m => m.ProjectListComponent)
      },
      {
        path: 'vendors',
        loadComponent: () => import('./pages/vendor-list/vendor-list.component').then(m => m.VendorListComponent)
      },
      {
        path: 'vendors/create',
        loadComponent: () => import('./pages/vendor-create/vendor-create.component').then(m => m.VendorCreateComponent)
      },
      {
        path: 'vendors/:id/edit',
        loadComponent: () => import('./pages/vendor-edit/vendor-edit.component').then(m => m.VendorEditComponent)
      },
      {
        path: 'bom',
        loadComponent: () => import('./pages/bom-list/bom-list.component').then(m => m.BomListComponent)
      },
      {
        path: 'bom/:id',
        loadComponent: () => import('./pages/bom-detail/bom-detail.component').then(m => m.BomDetailComponent)
      },
      {
        path: 'bom/:id/revision/:revId',
        loadComponent: () => import('./pages/bom-revision-review/bom-revision-review.component').then(m => m.BomRevisionReviewComponent)
      },
      {
        path: 'purchase-requests',
        loadComponent: () => import('./pages/pr-list/pr-list.component').then(m => m.PrListComponent)
      },
      {
        path: 'purchase-requests/create',
        loadComponent: () => import('./pages/pr-create/pr-create.component').then(m => m.PrCreateComponent)
      },
      {
        path: 'purchase-requests/:id/edit',
        loadComponent: () => import('./pages/pr-create/pr-create.component').then(m => m.PrCreateComponent)
      },
      {
        path: 'inventory',
        loadComponent: () => import('./pages/inventory-list/inventory-list.component').then(m => m.InventoryListComponent)
      },
      {
        path: 'purchase-requests/:id',
        loadComponent: () => import('./pages/pr-detail/pr-detail.component').then(m => m.PrDetailComponent)
      },
      {
        path: 'quotation-management',
        loadComponent: () => import('./pages/quotation-management/quotation-management.component').then(m => m.QuotationManagementComponent)
      },
      {
        path: 'quotation-analysis/:id',
        loadComponent: () => import('./pages/quotation-analysis/quotation-analysis.component').then(m => m.QuotationAnalysisComponent)
      },
      {
        path: 'manager-approvals',
        loadComponent: () => import('./pages/manager-approvals/manager-approvals.component').then(m => m.ManagerApprovalsComponent)
      },
      {
        path: 'po',
        loadComponent: () => import('./pages/po-list/po-list.component').then(m => m.PoListComponent)
      },
      {
        path: 'po/create',
        loadComponent: () => import('./pages/po-create/po-create.component').then(m => m.PoCreateComponent)
      },
      {
        path: 'po/:id/edit',
        loadComponent: () => import('./pages/po-create/po-create.component').then(m => m.PoCreateComponent)
      },
      {
        path: 'po/:id',
        loadComponent: () => import('./pages/po-detail/po-detail.component').then(m => m.PoDetailComponent)
      },
      {
        path: 'grn',
        loadComponent: () => import('./pages/grn-list/grn-list.component').then(m => m.GrnListComponent)
      },
      {
        path: 'grn/create',
        loadComponent: () => import('./pages/grn-create/grn-create.component').then(m => m.GrnCreateComponent)
      },
      {
        path: 'grn/:id/edit',
        loadComponent: () => import('./pages/grn-create/grn-create.component').then(m => m.GrnCreateComponent)
      },
      {
        path: 'grn/:id',
        loadComponent: () => import('./pages/grn-view/grn-view.component').then(m => m.GrnViewComponent)
      },
      {
        path: 'iqc',
        loadComponent: () => import('./pages/iqc-list/iqc-list.component').then(m => m.IqcListComponent)
      },
      {
        path: 'iqc/:id',
        loadComponent: () => import('./pages/iqc-inspect/iqc-inspect.component').then(m => m.IqcInspectComponent)
      },
      {
        path: 'mrn',
        loadComponent: () => import('./pages/mrn-list/mrn-list.component').then(m => m.MrnListComponent)
      },
      {
        path: 'mrn/create',
        loadComponent: () => import('./pages/mrn-create/mrn-create.component').then(m => m.MrnCreateComponent)
      },
      {
        path: 'mrn/:id',
        loadComponent: () => import('./pages/mrn-detail/mrn-detail.component').then(m => m.MrnDetailComponent)
      },
      {
        path: 'mrn/:id/fulfill',
        loadComponent: () => import('./pages/mrn-fulfillment/mrn-fulfillment.component').then(m => m.MrnFulfillmentComponent)
      },
      {
        path: 'payment-management',
        loadComponent: () => import('./pages/payment-list/payment-list.component').then(m => m.PaymentListComponent)
      },
      {
        path: 'rejection-log',
        loadComponent: () => import('./pages/rejection-log/rejection-log.component').then(m => m.RejectionLogComponent)
      },
    ]
  },
  { path: '**', redirectTo: 'login' }
];
