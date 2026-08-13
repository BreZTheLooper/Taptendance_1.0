# Taptendance

Taptendance is a browser-based QR code attendance system. A teacher/admin scans student-generated QR codes with a webcam to log time-in and time-out, then exports the session's attendance as an Excel file. It runs entirely client-side — no backend server or database required.

## Features

- **Teacher / Admin panel**
  - Live camera QR scanner (with camera selection and refresh) plus a fallback "scan from image file" option
  - Generates a session QR code that students scan to join
  - Local-network verification — students must be on the same network as the admin device to join a session (relaxed automatically when hosted on GitHub Pages)
  - Records table with search and quick filters (All / Today / This Week)
  - "Mark All Out" to bulk time-out any open records
  - Export attendance to a formatted `.xlsx` file, with a custom title (e.g. class/club/org name) placed above the data

- **Student panel**
  - Reveals itself only after a student joins via the session QR (hidden otherwise)
  - Simple form: ID, Name, Course, Year, Section
  - Generates a personal attendance QR code for the admin to scan (time-in), can be downloaded as an image
  - Detects duplicate check-ins for the same session and offers a "request correction" link

- **Records view**
  - Sortable/searchable table of ID, Name, Course, Year, Section, Date, Time In, Time Out, Remarks
  - Placeholder for a Google Sheets API key, for teams that want to sync/back records to Sheets

- **Accounts**
  - Lightweight client-side sign-up/login (email + password), restricted to a pre-approved list of email addresses
  - Passwords are hashed (SHA-256) before being stored
  - Auth modal is automatically suppressed for students joining through a session link

- **Theming**
  - Light/dark mode toggle

## Tech Stack

| Piece | Purpose |
|---|---|
| `index.html` | Page structure and markup for the Teacher, Student, and Records screens |
| `style.css` | All styling, including light/dark theme variables |
| `script.js` | App logic: auth, camera/QR scanning, session + network checks, records management, Excel export |
| [jsQR](https://github.com/cozmo/jsQR) | Decodes QR codes from the camera feed / uploaded images |
| [QRious](https://github.com/neocotic/qrious) | Generates QR codes (session QR, student attendance QR, info QR codes) |
| [SheetJS (xlsx)](https://github.com/SheetJS/sheetjs) | Builds and downloads the exported `.xlsx` attendance file |

All three libraries are loaded from public CDNs — an internet connection is required even though the app itself has no backend.

## Getting Started

1. Download/clone the three files (`index.html`, `style.css`, `script.js`) into the same folder, along with an `assets/logo.png` for the header logo.
2. Open `index.html` in a browser, or serve the folder with any static file server (or GitHub Pages).
3. On first load you'll be prompted to sign up or log in with an approved email address (see [Account Access](#account-access) below).
4. **As the teacher/admin:**
   - Go to the **Teacher** tab.
   - Click **Generate Session QR** so students can scan it to join.
   - Click **Start Scanner** and scan each student's attendance QR as they show it.
   - Use the **Records** tab to review, search, filter, and mark students out.
   - Enter a class/org name in the export field and download the attendance as Excel.
5. **As a student:**
   - Scan the session QR shown by the admin (must be on the same local network).
   - Fill in ID, Name, Course, Year, and Section, then generate your attendance QR.
   - Show your generated QR to the admin's scanner to be recorded.

## Account Access

Sign-up is restricted to a whitelist of email addresses defined in `script.js` (`ALLOWED_AUTH_EMAILS`). To grant access to a new user, add their email to that array. Account credentials and attendance records are stored in the browser's `localStorage`, so data is local to the device/browser running the admin session unless you wire up the optional Google Sheets sync.

## Notes & Limitations

- **Local-network requirement:** by default, students must be on the same network as the teacher's device to join a session. This check is automatically relaxed when the app is hosted on GitHub Pages.
- **Client-side only:** there is no server, so accounts, sessions, and records all live in the browser's local storage on the device running the Teacher panel. Clearing browser data will clear records.
- **Camera access:** the scanner requires camera permissions; use "Test Camera Access" on the Teacher tab to troubleshoot.
- **Google Sheets sync:** the Records screen includes a placeholder for an API key to sync with Google Sheets — this requires you to supply and wire up your own key/integration.

## File Structure

```
.
├── index.html   # App markup (Teacher, Student, Records screens; auth & network modals)
├── style.css    # Styling and theme variables
├── script.js    # Auth, scanning, session, records, and export logic
└── assets/
    └── logo.png # Header logo (not included — add your own)
```
