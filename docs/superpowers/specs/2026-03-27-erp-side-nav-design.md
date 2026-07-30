# 2026-03-27-ERP-Side-Nav-Design

## Problem Statement
1. **User Listing Bug**: The current AngularJS `demo/index.html` app has a "duplicate in repeater" error that prevents newly created users from being listed.
2. **Missing Side Navigation**: The application needs a robust sidebar to support future modules and improved navigation.

## Proposed Design (Approach 1: Static List Sidebar)

### 1. Functional Improvements
- **State Management**: Fix `ng-repeat` to use `track by $index` in `demo/index.html` to allow duplicate objects (mockup data).
- **Navigation**: Implement a static list of ERP modules in the common layout (`admin-layout`).

### 2. User Interface Design
- **Sidebar (260px)**:
    - **Header**: Brand Shield + "GEN ROBOTICS".
    - **Navigation List**:
        - Dashboard
        - User Management (Active)
        - **Modules (NEW)**:
            - BOM Management
            - Procurement (Purchase Requests & Orders)
            - GRN (Goods Receipt Note)
            - IQC (Quality Control)
            - Stock Inventory
- **Visuals**: Distinctive icons, bold left-accent for active items, and subtle micro-interactions.

### 3. Technical Changes
- **AngularJS (demo/index.html)**: 
    - Update the side navigation template with the new static list.
    - Resolve the `ng-repeat` bug with `track by $index`.
- **Angular (frontend-src)**: 
    - Sync the `admin-layout.component.html` and `admin-layout.component.css` with the new design to ensure future readiness.

## Open Questions
- Should the "Procurement" group be expandable or a flat list of Purchase items? (Current design: Flat List for Approach 1).

## Success Criteria
- Newly created users appear in the grid after registration.
- All sidebar items are visible and formatted with icons.
- Navigation remains consistent between `Login` and `Admin` views.
