import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, Payment } from '../../services/payment.service';

@Component({
  selector: 'app-payment-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-list.component.html',
  styleUrls: ['./payment-list.component.css']
})
export class PaymentListComponent implements OnInit {
  payments: Payment[] = [];
  searchQuery = '';
  
  showSettleModal = false;
  showHistoryModal = false;
  showParamModal = false;
  selectedPayment: Payment | null = null;
  
  paramForm = {
    due_date: '',
    settlement_type: ''
  };
  
  settlementForm = {
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    reference_no: '',
    remarks: ''
  };

  constructor(private paymentService: PaymentService) {}

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments() {
    this.paymentService.getPayments().subscribe({
      next: (data) => {
        console.log('Payments loaded:', data);
        this.payments = data.map((p: any) => ({ ...p, isEditing: false }));
      },
      error: (err) => {
        console.error('Failed to load payments', err);
        alert('Failed to load payments: ' + (err.message || 'Unknown error'));
      }
    });
  }

  get filteredPayments() {
    if (!this.searchQuery) return this.payments;
    const q = this.searchQuery.toLowerCase();
    return this.payments.filter(p => 
      p.PurchaseOrder?.po_no?.toLowerCase().includes(q)
    );
  }

  openParamModal(payment: Payment) {
    this.selectedPayment = payment;
    this.paramForm = {
      due_date: payment.due_date || '',
      settlement_type: payment.settlement_type || 'Credit'
    };
    this.showParamModal = true;
  }

  submitParams() {
    if (!this.selectedPayment) return;
    
    this.paymentService.updatePayment(this.selectedPayment.id, this.paramForm).subscribe({
      next: () => {
        this.showParamModal = false;
        this.loadPayments();
      },
      error: (err) => alert('Failed to update: ' + (err.error?.error || 'Unknown error'))
    });
  }

  updateField(payment: Payment) {
    this.paymentService.updatePayment(payment.id, {
      due_date: payment.due_date,
      settlement_type: payment.settlement_type
    }).subscribe({
      next: () => console.log('Payment updated'),
      error: (err) => alert('Failed to update: ' + err.error?.error)
    });
  }

  openSettleModal(payment: Payment) {
    this.selectedPayment = payment;
    const balance = payment.total_amount - payment.paid_amount;
    this.settlementForm = {
      amount: Math.round(balance * 100) / 100,
      payment_date: new Date().toISOString().split('T')[0],
      reference_no: '',
      remarks: ''
    };
    this.showSettleModal = true;
  }

  submitSettlement() {
    if (!this.selectedPayment) return;
    
    this.paymentService.settlePayment(this.selectedPayment.id, this.settlementForm).subscribe({
      next: () => {
        this.showSettleModal = false;
        this.loadPayments();
      },
      error: (err) => alert('Settlement failed: ' + (err.error?.error || 'Unknown error'))
    });
  }

  viewHistory(payment: Payment) {
    this.selectedPayment = payment;
    this.showHistoryModal = true;
  }
}
