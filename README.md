# TABBYMART Returns & Claims Management System

A production-ready warehouse return receipt, SKU lookup, marketplace claims tracking (SPF / T-Safe), and Google Sheets synchronization system built for **TABBYMART** operations.

---

## 🚀 Key Features

- **Multi-Marketplace Intake**: Fast intake and barcode scanning for Flipkart, Amazon, Meesho, Shopsy, and Direct orders.
- **Master SKU & Variant Lookup**: Automated SKU validation, product name resolution, and baseline weight comparison.
- **Weight Discrepancy & Fraud Detection**: Automatically flags under-weight or over-weight returns beyond tolerance thresholds to identify potential empty boxes or tampered items.
- **SPF & T-Safe Claims Tracking**: Dedicated workflow for filing marketplace claims with tracking numbers, claim statuses, photographic inspection logs, and turnaround timestamps.
- **Google Sheets Two-Way Synchronization**:
  - Live appending of new returns.
  - In-place row updates and inspection edits.
  - Permanent row deletions synchronized directly to the Google Sheet.
  - Dynamic column detection (adapts to custom sheet columns safely).
- **Zero-CORS Express Backend Proxy**: Built-in `/api/gas-proxy` route in `server.ts` that transparently handles Google Apps Script 302 redirects and prevents browser CORS blocking.
- **Resilient Local Persistence**: Automatically falls back to browser storage if offline or if Google Apps Script is not yet configured, ensuring zero data loss during warehouse operations.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion
- **Backend / Proxy**: Node.js, Express, `tsx`
- **Data Store & Sync**: Google Sheets API via Google Apps Script (`gas/Code.gs`)
- **Build & Dev Tooling**: Vite with full-stack Express middleware

---

## 📦 Project Structure

```text
├── gas/
│   └── Code.gs               # Google Apps Script Web App backend script
├── public/                   # Static assets
├── src/
│   ├── components/           # React UI components
│   │   ├── ReturnsForm.tsx       # Intake & scanning form
│   │   ├── ReturnsLogTable.tsx   # Returns inspection, editing & deletion log
│   │   ├── ClaimsTracker.tsx     # SPF & T-Safe claims management
│   │   ├── AnalyticsDashboard.tsx# Warehouse return rate & loss analytics
│   │   ├── SkuDirectory.tsx      # Master SKU catalog & weights
│   │   └── SettingsModal.tsx     # Google Apps Script URL configuration & diagnostics
│   ├── services/
│   │   └── storageService.ts # Local + Google Sheets sync service with proxy dispatcher
│   ├── types.ts              # TypeScript domain types
│   ├── App.tsx               # Main application container
│   ├── main.tsx              # React DOM entry point
│   └── index.css             # Tailwind v4 styles
├── server.ts                 # Express proxy and Vite development/production server
├── index.html                # Application entry HTML
├── metadata.json             # App metadata & capabilities
├── package.json              # Project dependencies and run scripts
└── tsconfig.json             # TypeScript configuration
```

---

## ⚡ Quick Start

### 1. Clone & Install Dependencies

```bash
git clone <your-repository-url>
cd <repository-directory>
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

The app will start at `http://localhost:3000`.

### 3. Build for Production

```bash
npm run build
npm start
```

---

## 📋 Google Sheets & Apps Script Setup

To connect the application to your live Google Sheet:

1. **Create or Open a Google Sheet**:
   - Create a Google Sheet named e.g. `TABBYMART Operations`.
   - Ensure you have a sheet tab named `Returns` (or let the script automatically initialize it).
2. **Open the Apps Script Editor**:
   - In your Google Sheet, click **Extensions** > **Apps Script**.
3. **Copy the Script**:
   - Replace the default code with the contents of [`gas/Code.gs`](gas/Code.gs).
4. **Deploy as Web App**:
   - Click **Deploy** > **New deployment**.
   - Select **Web app** as the deployment type.
   - Set **Execute as**: `Me (<your-email>)`.
   - Set **Who has access**: `Anyone`. *(Crucial: allows the system to sync data securely).*
   - Click **Deploy** and grant Google permissions if prompted.
   - Copy the generated **Web App URL** (ends in `/exec`).
5. **Connect in the App**:
   - In the TABBYMART app, click the **Settings** gear icon in the top header.
   - Paste the Web App URL into the **Google Apps Script URL** field.
   - Click **Test Connection** & **Save Settings**.

---

## 🚢 Publishing to GitHub

To push this codebase to your GitHub repository:

```bash
# Rename branch to main (if not already main)
git branch -M main

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: TABBYMART Returns & Claims Management System"

# Add your GitHub repository as remote origin
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# Push to GitHub
git push -u origin main
```

---

## 🌐 Deploying to Production (Render / Railway / Vercel / VPS)

- **Node.js Environment**: Supports Node.js 18+ and 22+.
- **Build Command**: `npm run build`
- **Start Command**: `npm start` (or `tsx server.ts`)
- **Port**: Set `PORT` environment variable (defaults to `3000`).

---

## 📄 License

Internal Operations & Warehouse Management System — TABBYMART.
