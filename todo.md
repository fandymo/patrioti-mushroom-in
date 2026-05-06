# Patrioti Mushrooms - Project TODO

## Foundation
- [x] Database schema (employees, rooms, packaging_types, categories, shifts, harvest_records, audit_log)
- [x] Global styles: Hebrew RTL, elegant theme, mobile-first
- [x] DashboardLayout with Hebrew sidebar navigation

## Authentication & Roles
- [x] Role-based access control (admin/worker)
- [x] Admin procedure middleware
- [x] Login flow with email/password authentication

## Data Entry
- [x] Harvest entry form (date, employee, room, shift, packaging, category, boxes, weight, notes)
- [x] Mobile-optimized quick entry with save & continue
- [x] Auto-calculated average weight per box

## Employee Management
- [x] Employee list with search and status filter
- [x] Add/edit employee dialog
- [x] Activate/deactivate employees

## Room Management
- [x] Room list with status
- [x] Add/edit room dialog
- [x] Activate/deactivate rooms

## Master Data Management
- [x] Packaging types CRUD
- [x] Categories CRUD
- [x] Shifts CRUD

## Daily Records
- [x] Daily records list with filters (date, employee, room, shift, packaging, category)
- [x] Edit harvest record
- [x] Approval workflow (draft/approved/cancelled)
- [x] Summary totals (weight, boxes, records count)

## Reports
- [x] Daily summary report
- [x] Report by employee
- [x] Report by room
- [x] Report by shift
- [x] CSV export capability

## Admin Dashboard
- [x] Today/week/month harvest summary cards
- [x] Top 5 employees by weight chart
- [x] Top 5 rooms by productivity chart
- [x] Packaging type distribution chart
- [x] Category distribution chart
- [x] Daily/weekly trend chart
- [x] Pending approval count

## UI/UX
- [x] Full Hebrew language support
- [x] RTL layout throughout
- [x] Mobile-responsive design
- [x] Elegant visual style

## Testing
- [x] Vitest unit tests for all routers (39 tests passing)

## Data Updates
- [x] Update categories: לבן (White), חום (Brown) mushroom types
- [x] Add packaging type: DUETO
- [x] Add sizes table to database schema (Small, Basket, Filling)
- [x] Add sizeId field to harvest_records table
- [x] Update backend API: sizes CRUD + harvest routes with sizeId
- [x] Update harvest entry form with size selector
- [x] Update harvest records list to show size
- [x] Update reports to include size data
- [x] Update settings page with sizes management tab

## Language Conversion - English
- [x] Convert DashboardLayout sidebar to English
- [x] Convert Home/Dashboard page to English
- [x] Convert HarvestEntry page to English
- [x] Convert HarvestRecords page to English
- [x] Convert Employees page to English
- [x] Convert Rooms page to English
- [x] Convert Settings page to English
- [x] Convert Reports page to English
- [x] Update HTML lang attribute, switch to LTR, change font to Inter
- [x] Verify all tests pass after conversion (28/28 passing)

## Login & User Management
- [x] Create styled login page with Manus OAuth
- [x] Add userId field to employees table to link employee to user account
- [x] Admin can link user accounts to employees
- [x] Admin can change user roles (admin/worker)
- [x] Worker role restriction: can only enter harvest data for their own linked employee
- [x] Update harvest entry form to auto-select employee for workers
- [x] Update backend to enforce worker restriction on harvest creation
- [x] Add user management page for admin
- [x] Admin-only menu items hidden from workers
- [x] Unlinked workers see warning message
- [x] Vitest tests updated (39 tests passing)

## UI Changes
- [x] Remove Packaging field from harvest entry form (keep Mushroom Type and Size)

## Inventory & Barcode Module
### Database
- [x] Add harvest_wave field to harvest_records table
- [x] Create harvested_inventory table (barcode, batch, date, room, wave, employee, product type, variety, weight fields, status)
- [x] Create packed_inventory table (barcode, batch, source link, packing date, wave, product type, packaging type, weight, units, expiry, status)
- [x] Create inventory_movements table (date, type, inventory type, item ID, weight/qty, user, notes)
- [x] Create barcode_sequences table for running numbers

### Backend API
- [x] Harvested inventory CRUD + barcode generation (H-YYMMDD-RR-BB-SSSS format)
- [x] Packed inventory CRUD + barcode generation (P-YYMMDD-LN-SSSS format)
- [x] Barcode lookup endpoint (scan → identify item)
- [x] Consume harvested item (full/partial) for packing
- [x] Outbound scanning (mark packed item as shipped)
- [x] Inventory movements log (immutable, correction-only)
- [x] Inventory summary queries (harvested available, packed available, totals)

### Frontend - Intake & Packing
- [x] Harvested product intake screen (weigh, save, print barcode)
- [x] Barcode scan screen for packing (scan harvested → consume → create packed)
- [x] Packed product creation screen (link source, weigh, save, print barcode)
- [x] QR code generation for labels (print window with barcode info)
- [x] Label layout: harvested product (barcode, date, wave, weight, boxes)
- [x] Label layout: packed product (barcode, date, weight, units, expiry)

### Frontend - Inventory & Scanning
- [x] Harvested inventory list with filters (status, search)
- [x] Packed inventory list with filters (status, search)
- [x] Outbound scanning screen (scan packed → mark shipped, session summary)
- [x] Inventory dashboard (harvested count, packed count, shipped, total in stock)
- [x] Inventory movements log view with type/inventory filters

### Reports
- [x] Harvested inventory report (via inventory list)
- [x] Packed inventory report (via inventory list)
- [x] Available inventory report (via inventory summary)
- [x] Inventory movements report (via movement log)
- [x] Outbound report (via outbound scan session)
- [x] Traceability (backend API ready)
- [x] Report by picker/employee (existing reports)
- [x] Report by harvest wave (existing reports)

### Existing System Updates
- [x] Add harvest wave field to existing harvest entry form
- [x] Add harvest wave to existing harvest records list
- [x] Add harvest wave to existing reports
- [x] Update sidebar navigation with inventory section

## Packing Station Redesign
- [x] Redesign Packing page: simple form-first flow (no barcode scanning step)
- [x] Form fields: date, harvest wave, mushroom type, size, packaging type, weight, unit count, expiry, notes
- [x] On submit: save packed item to DB and generate barcode
- [x] Generate QR Code containing all product data
- [x] Auto-print label with QR code via label printer (thermal/sticker printer compatible)
- [x] Label layout: QR code + product info (barcode ID, date, type, packaging, weight, units, expiry)

## Bug Fixes
- [x] Fix auth.myEmployee error on Packing page - query returns undefined data for admin users

## Manual User Creation by Email
- [x] Add backend route: admin creates user by entering name, email, role (no external API)
- [x] Add "Add User" form to User Management page with name, email, role, employee link fields
- [x] Generate a placeholder openId for manually-created users
- [x] Auto-link when user logs in via OAuth with matching email (OAuth callback updated)
- [x] Update User Management UI with Add User dialog and pending status indicator
- [x] Duplicate email prevention
- [x] All 49 tests passing

## Remove User Feature
- [x] Add deleteUser backend route (admin only, prevent self-delete)
- [x] Add delete button with confirmation dialog to User Management UI
- [x] Unlink employee when user is deleted

## Bug Fixes (cont.)
- [x] Fix Google login issue - replaced with email/password auth
- [x] Fix OAuth "Permission denied - App config not found" - replaced OAuth with password auth

## Replace OAuth with Password Authentication
- [x] Add passwordHash field to users table in database schema
- [x] Create password-based login API endpoint
- [x] Create session management with JWT (no OAuth)
- [x] Update Login page: email + password form (remove Manus OAuth)
- [x] Update User Management: admin sets password when creating users
- [x] Update User Management: admin can reset user passwords
- [x] Remove Manus OAuth dependency from login flow
- [x] Set passwords for existing admin accounts
- [x] Update tests for new auth system (58 tests passing)

## Harvest Wave Limit
- [x] Limit Harvest Wave options to maximum 3 (waves 1, 2, 3) across all pages

## Bug Fixes (React)
- [x] Fix React error #31 - Date object rendered directly as React child (InventoryList, MovementLog)

## Harvest Label Printing Improvements
- [x] Fix harvest entry not printing label after save (auto-print on both pages)
- [x] Add worker name and date to printed harvest label
- [x] Print multiple copies based on box count entered (Box 1 of N)
- [x] Label includes: worker name, date, room, type, size, wave, weight, avg/box, box number

## Bug Fix - Harvest Intake Insert Error
- [x] Fix harvested_inventory insert failure (barcode_sequences table missing unique constraint on prefix - duplicate rows caused same barcode to be generated)

## Barcode Lines on Labels
- [x] Replace text/QR barcodes with actual barcode lines (Code 128) on all printed labels
- [x] Update Harvest Entry labels with barcode image
- [x] Update Harvest Intake labels with barcode image
- [x] Update Packing labels with barcode image (replaced QR code with Code 128 barcode)

## SEO Fixes
- [x] Add meta description tag to homepage (130 characters)
- [x] Add meta keywords tag to homepage (8 keywords)

## Label Size Update
- [x] Update label size from 80mm x 50mm to 100mm x 68mm on all pages
