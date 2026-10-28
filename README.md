# Vybhz — Frontend Client Application

The omnichannel client tier for the Vybhz entertainment booking platform, delivering a responsive Web SPA and native mobile applications (Android & iOS via Capacitor).

---

## Tech Stack & Architecture

- **Core Framework**: React `18.3.1`, TypeScript `5.5.4`, Vite `5.4.2`
- **Routing**: React Router DOM `6.26.2`
- **Styling**: Tailwind CSS `3.4.10`, PostCSS `8.4.41`, Autoprefixer `10.4.20`, Tailwind CSS Animate `1.0.7`
- **UI Primitives**: Radix UI suite (Accordion, Dialog, Dropdown, Tabs, etc.), Lucide React `0.446.0`
- **Data & Animation**: Axios `1.7.7`, Framer Motion `13.1.1`, Recharts `2.12.7`, Vaul `0.9.9`, Sonner `1.5.0`
- **Maps & 360 View**: Leaflet `1.9.4`, React-Leaflet `4.2.1`, PhotoSphere Viewer `5.15.1`
- **Mobile Runtime**: Capacitor `8.5.2` (Android Target SDK `36`, iOS Deployment Target `15.0`)

---

## Core Capabilities & High-Concurrency Implementations

### 1. Cinema & Seat Selection
- **Interactive Seat Map**: Real-time cinema layout renderer with tiered pricing (VIP, Executive, Standard).
- **Live Seat Lock Conflict Overlay**: Instant reflection of actively locked seats across tabs without full-page reloads.
- **Virtual Waiting Room Modal**: Real-time radar animation displaying queue position, estimated wait time, and cryptographic pass handoff during high-traffic flash sales (`SeatMapPage.tsx`).
- **Showtime Availability Indicators**: Real-time color-coded badges (`Available`, `Fast Filling`, `Almost Full`, `Sold Out`) with a visual legend (`BuyTicketsPage.tsx`).

### 2. Offline Passbook & Gate Scanning
- **Client-Side Offline Pass Storage**: E-tickets and admission QR codes are automatically cached in `localStorage` (`vybhz_offline_passes_v1`) for zero-connectivity access in underground cinema basements (`BookingDetailPage.tsx`).
- **Offline Gate Scanner Admission Queue**: Operator scanner at `/theatre/validate` decodes HMAC-SHA256 cryptographically signed QR codes offline and queues check-in scans for automatic sync upon reconnection (`TheatreTicketValidatorPage.tsx`).

### 3. Financial Transparency & Checkout
- **Itemized GST & Convenience Fee Breakdown**: Transparent calculation of base ticket pricing, statutory GST, and platform fees in checkout and booking summaries.
- **Razorpay Checkout Integration**: Multi-platform checkout supporting UPI, NetBanking, and credit/debit cards on both web and native mobile.

### 4. Admin & Partner Portals
- **Section-Wise Granular RBAC**: Dynamic administrative sidebar adapting navigation and actions to operator permissions (`CAN_MANAGE_MOVIES`, `CAN_MANAGE_SHOWTIMES`, `CAN_MANAGE_FINANCE`, etc.).
- **Scoped Theatre Portal**: Full operational interface for cinema box offices (dashboard, screen layouts, scheduler, ticket validator, and invoices).

---

## Getting Started

### Prerequisites
- Node.js `20.x` or higher
- npm `10.x` or higher

### Installation & Development
```bash
# Install dependencies (automatically runs patch-package on postinstall)
npm install

# Start Vite development server
npm run dev
```
Client runs at `http://localhost:5173`.

### Production Build
```bash
# Type check and build static production assets into dist/
npm run build

# Preview production build locally
npm run preview
```

### Native Mobile Synchronization
```bash
# Sync web build to native Android & iOS Capacitor wrappers
npx cap sync
```
