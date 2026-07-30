# Payment Management Module Design Spec

**Date**: 2026-04-23
**Status**: Draft
**Scope**: Vendor Payment Tracking for Purchase Orders

## 1. Overview
A specialized module for the Finance and Admin teams to manage and track the lifecycle of vendor payments originating from approved Purchase Orders (POs). The module automates the creation of payment records and provides a structured way to handle partial settlements, credit terms, and payment history.

## 2. User Roles & Access
- **Finance / Accounts**: Full CRUD access to payments and history.
- **Admin**: Full CRUD access.
- **Other Departments**: No access to this module.

## 3. Data Models

### Payment (Main Record)
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary Key |
| po_id | Integer | Foreign Key to PurchaseOrder |
| total_amount | Decimal | Taken from PO total at creation |
| paid_amount | Decimal | Sum of all history entries (computed/cached) |
| due_date | Date | Mandatory. Editable inline when status != Closed |
| settlement_type | String | Mandatory (Cash/Credit). Editable inline when status != Closed |
| status | Enum | OPEN, PARTIAL, CLOSED |

### PaymentHistory (Installments)
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary Key |
| payment_id | Integer | Foreign Key to Payment |
| amount | Decimal | Amount paid in this turn |
| payment_date | Date | Date of payment |
| mode | String | Cash, Bank Transfer, Check, UPI |
| reference_no | String | Transaction ID or Check Number |
| remarks | Text | Optional notes |

## 4. Key Workflows

### 4.1 Automated Record Creation
- **Trigger**: When a `PurchaseOrder` is marked as `is_approved`.
- **Action**: A new `Payment` record is created.
- **Initial State**: `total_amount` set from PO, `paid_amount` = 0, `status` = 'OPEN'.

### 4.2 Settlement Management
- **Inline Edit**: Finance enters the `Due Date` and `Settlement Type`.
- **Settle Action**: User enters payment details via a modal.
- **Auto-Status Update**:
    - If `paid_amount` == 0: **OPEN**
    - If `paid_amount` > 0 AND < `total_amount`: **PARTIAL**
    - If `paid_amount` >= `total_amount`: **CLOSED**

### 4.3 History & Audit
- Users can view a chronological list of payments for any PO.
- A "Pen" icon allows editing `Due Date/Settlement Type` for non-closed payments.
- Completed payments show a visual confirmation (Tick).

## 5. UI/UX Specifications
- **Layout**: Table-based as per provided mockup.
- **Search**: Real-time search by PO Number.
- **Color Coding**:
    - OPEN: Neutral/Gray
    - PARTIAL: Orange
    - CLOSED: Green

## 6. Technical Implementation
- **Backend**: Node.js/Sequelize.
- **Frontend**: Angular standalone components.
- **Security**: Permission guard based on department/role.
