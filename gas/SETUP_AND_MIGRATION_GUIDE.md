# TABBYMART Returns & Claims Management System
## Production Connectivity & SKU Master Setup Guide: "Warehouse Returns Master & P&L Ledger"

This guide explains how to connect your Google Drive spreadsheet named **"Warehouse Returns Master & P&L Ledger"**, how to fetch and synchronize your uploaded SKU Master list from the second tab, how to use the searchable SKU dropdown, and how the return save intimation works for warehouse operators.

---

### Part 1: How to Fetch Your SKU Master List from the Second Tab

If you have uploaded your SKU Master list into the second tab of your Google Sheet and they are not appearing in the app, here is why and the exact 2-minute procedure to fetch them:

#### Why SKUs might not have appeared initially:
1. **Sheet Tab Name**: When you imported or created the second tab, Google Sheets may have named it `Sheet2`, `Sheet2 (2)`, or `SKU Master` (with a space), whereas older code was looking strictly for `SKU_Master`.
   - **Fix Applied**: Our upgraded `gas/Code.gs` now automatically inspects your second tab by index (`ss.getSheets()[1]`), as well as checking names like `Sheet2 (2)`, `Sheet2`, `SKU_Master`, `SKU Master`, and `Tabbymart_Amazon_SKU_Master`.
2. **Column Headers**: The Excel file uses `Mfg + Frieght` (spelled with `ie`). The script now automatically detects `Mfg + Frieght`, `Mfg + Freight`, `Weight (grams)`, `SKU Code`, and `SKU Name` regardless of spelling or order.
3. **Web App Permissions**: In Google Apps Script, the deployment must be configured with **"Who has access: Anyone"** so the app can read the SKUs without Google authentication roadblocks.

---

#### Procedure A: Live Auto-Sync via Google Apps Script (Recommended)
1. Open your Google Sheet **"Warehouse Returns Master & P&L Ledger"** in Google Drive.
2. Click **Extensions > Apps Script** in the top menu.
3. Open `Code.gs`, select all, and paste the updated code from **`gas/Code.gs`**.
4. Click the **Save** floppy icon.
5. Click **Deploy > New deployment** (or **Manage deployments** > edit > **New version**).
   - Set **Execute as**: `Me (your Google account)`
   - Set **Who has access**: `Anyone`
   - Click **Deploy** and copy the **Web App URL** (starts with `https://script.google.com/macros/s/.../exec`).
6. In the TABBYMART app, go to **Database & Sync Hub**, paste your Web App URL, and click **Save Configuration**.
7. Now go to **Fast Receipt** (or **SKU Master**) and click:
   👉 **`[ 🔄 Fetch from Sheet ]`**
   - The app will connect to your second tab, read all SKU rows, and display:
     `✓ Successfully loaded X SKUs from Google Sheet tab!`
   - All SKUs are immediately ready in the **Product SKU Dropdown**!

---

#### Procedure B: 1-Click "Paste from Sheet" (Instant - Takes 10 Seconds!)
If you want to use the SKUs right now without touching Apps Script settings:
1. Open your Google Sheet **"Warehouse Returns Master & P&L Ledger"**.
2. Click the second tab where your SKU list is stored.
3. Press **`Ctrl + A`** (select all) and then **`Ctrl + C`** (copy).
4. In the TABBYMART app, under Section 3 (**Product SKU Auto-Lookup**), click:
   👉 **`[ 📋 Paste from Sheet ]`**
5. Press **`Ctrl + V`** (paste) into the box, and click **Import & Update Catalog**.
6. That's it! All SKUs, weights, costs, and variants are loaded into the app and immediately available in the dropdown!

---

### Part 2: Product SKU Dropdown & Search (How to Select by Dropdown or Type)

Warehouse operators have two flexible ways to identify products:

1. **Browse All SKUs by Dropdown (No typing needed)**:
   - Click the yellow **`Select ▼`** button in the SKU field.
   - The full dropdown menu opens showing all available SKUs in the catalog.
   - Each item clearly displays:
     - **Master SKU Code** (in bold monospace)
     - **Canonical Product Name**
     - **Expected Weight** (e.g., `850 g`)
     - **Manufacturing + Freight Cost** (e.g., `₹ 420`)
     - Any mapped marketplace variant aliases
   - Simply click any item to select it!

2. **Quick Type-to-Filter (Few Characters)**:
   - Click the search box and type just 2–3 characters of:
     - The SKU Code (e.g., `TBM` or `KTC` or `001`)
     - OR the product title (e.g., `spice`, `carousel`, `rack`, `bottle`)
     - OR an ASIN / FSN / variant code (e.g., `B09`, `FSN`)
   - The dropdown list filters in real-time as you type.
   - Click the matched product to populate all fields automatically.

3. **Auto-Populated Fields (Zero typing required)**:
   When an item is selected, the system instantly auto-fills:
   - Resolved Master SKU Code
   - Canonical Product Title
   - Expected Unit Weight (in grams)
   - Expected Total Weight (Unit Weight × Quantity)
   - Manufacturing + Freight Cost (in INR)

---

### Part 3: Return Save Intimation (How the Operator Knows It Is Saved)

Previously, operators had no visual feedback after pressing Save, causing uncertainty about whether the record was logged. We have introduced a multi-sensory **Save Intimation System**:

1. **Celebratory Save Intimation Modal**:
   - Immediately upon clicking **Save Return Record**, a high-visibility modal card appears in the center of the screen with a glowing emerald checkmark:
     `✅ RETURN RECORDED & SAVED!`
   - Displays the generated **Return Entry ID** (e.g., `TBM-RET-20261017-8921`) with a 1-click **Copy ID** button.
   - Summarizes:
     - **Marketplace & Order ID**: e.g., `Meesho • Order 402-1928312-991283`
     - **Product Title**: Canonical name
     - **Condition Badge**: `Sellable` (green) or `Not Sellable` (red)
     - **Disposition**: `Restock to Active Inventory` or `Claim Filing Required`
     - **Sync Status**: *"Synchronized to 'Warehouse Returns Master & P&L Ledger'"*
   - Includes an auto-advancing 5-second countdown progress bar so high-speed scanner operators can continue without having to click.
   - Large prominent button: **`[ ➕ Record Next Return (Ready) ]`** to immediately focus back on the Order ID field.

2. **Audible Sound Chime**:
   - Plays a pleasant, two-tone ascending chime (D5 587Hz → A5 880Hz) via the browser Web Audio API, giving operators clear auditory confirmation even in noisy warehouse conditions.

3. **Haptic Vibration Feedback**:
   - On mobile phones and handheld scanner computers, the device vibrates twice (`[100ms, 50ms, 100ms]`) upon successful database write.

4. **Persistent Top Confirmation Banner**:
   - Above the form, a green status banner remains:
     `✓ Last Return Successfully Logged to Database: TBM-RET-20261017-8921 • Order 402-1928312-991283`
   - Gives continuous peace of mind that previous packages were safely recorded.

---

### Part 4: Database Setup & Sheet Tabs Reference

Ensure your spreadsheet named **"Warehouse Returns Master & P&L Ledger"** in Google Drive has these 5 tabs:

| Tab Name | Purpose | Row 1 Headers |
| :--- | :--- | :--- |
| **`Return_Log`** | Logs all warehouse return receipts & inspections | `Return Entry ID` · `Created At` · `Created By` · `Last Updated At` · `Marketplace` · `Return Type` · `Receipt Date` · `Original Order ID` · `Marketplace Return ID` · `AWB / Tracking Number` · `Scanned / Selected Variant` · `Master SKU Code` · `Product Name Snapshot` · `Quantity Received` · `Expected Unit Weight (g)` · `Expected Total Weight (g)` · `Measured Package Weight (g)` · `Weight Discrepancy (g)` · `Manufacturing + Freight Cost (INR)` · `Total Inventory Value (INR)` · `Package Condition` · `Item Condition` · `Inspection Status` · `Disposition Decision` · `Damage Details` · `Warehouse Notes` · `Photo / Evidence Links` · `Inspection Date` · `Financial Review Status` · `Claim Eligible` · `Duplicate Check Key` |
| **`SKU_Master`** *(or second tab)* | Master SKU catalog, weights, and costs | `Master SKU Code` · `SKU Name` · `Weight (grams)` · `Mfg + Freight Cost` · `SKU Variants Map` · `Category` · `Active Status` · `Notes` · `Last Updated At` |
| **`SKU_Variants`** | Normalized variant / alias mapping | `Variant / Alias Code` · `Master SKU Code` · `Variant Description` · `Active Status` · `Source Channel` · `Created At` |
| **`Claims_Log`** | Amazon SPF, T-Safe & marketplace claims | `Internal Claim ID` · `Claim Type` · `Marketplace` · `Related Return Entry ID` · `Order ID` · `Marketplace Return ID` · `AWB / Tracking Number` · `Claim Reference ID` · `Claim Reason / Category` · `Claim Amount Requested` · `Claim Amount Approved / Recovered` · `Currency` · `Submission Date` · `Submission Deadline` · `Claim Status` · `Evidence Checklist Completed` · `Evidence / Drive Links` · `Submission Notes` · `Last Follow-up Date` · `Next Follow-up Date` · `Rejection Reason` · `Appeal Status` · `Resolution Date` · `Recovery Reference` · `Created By` · `Last Updated At` |
| **`Audit_Log`** | Historical user audit trail | `Timestamp` · `User` · `Action` · `Entity Type` · `Entity ID` · `Details` |
