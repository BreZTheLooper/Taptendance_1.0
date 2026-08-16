# Taptendance

Taptendance is a browser-based QR code attendance system. A teacher/admin scans student-generated QR codes with a webcam to log time-in and time-out, then exports the session's attendance as an Excel file. It runs entirely client-side — no backend server or database required.

## Features

- **Teacher / Admin panel**
  - Live camera QR scanner (with camera selection and refresh) plus a fallback "scan from image file" option
  - Generates a session QR code that students scan to join
  - Records table with search and quick filters (All / Today / This Week)
  - "Mark All Out" to bulk time-out any open records, "Clear All" to wipe them
  - Export attendance to a formatted `.xlsx` file, with a custom title (e.g. class/club/org name) placed above the data

- **Student panel**
  - Reveals itself only after a student joins via the session QR (hidden otherwise)
  - Simple form: ID, Name, Course, Year, Section
  - Generates a personal attendance QR code for the admin to scan (time-in), can be downloaded as an image
  - Detects duplicate check-ins for the same session

- **Records view**
  - Sortable/searchable table of ID, Name, Course, Year, Section, Date, Time In, Time Out, Remarks
  - Persisted to `localStorage`, so records survive a page refresh
  - "＋ Sample Data" button seeds a handful of realistic demo rows for testing the table, filters, and export

- **Accounts**
  - Lightweight client-side sign-up/login (email + password), gated by a shared access code instead of a per-person allowlist
  - Passwords are hashed (SHA-256) before being stored
  - **Demo account** — a "Try the demo" button on the login screen signs in instantly with no account or access code needed, and shows a DEMO badge in the header
  - Auth modal is automatically suppressed for students joining through a session link

- **Theming**
  - Light/dark mode toggle, remembered across visits

## Tech Stack

| Piece | Purpose |
|---|---|
| `index.html` | Page structure and markup for the Teacher, Student, and Records screens |
| `style.css` | All styling, including light/dark theme variables |
| `script.js` | App logic: auth, camera/QR scanning, session handling, records management, Excel export |
| [jsQR](https://github.com/cozmo/jsQR) | Decodes QR codes from the camera feed / uploaded images |
| [QRious](https://github.com/neocotic/qrious) | Generates QR codes (session QR, student attendance QR, info QR codes) |
| [SheetJS (xlsx)](https://github.com/SheetJS/sheetjs) | Builds and downloads the exported `.xlsx` attendance file |

All three libraries are loaded from public CDNs — an internet connection is required even though the app itself has no backend.

## Getting Started

1. Download/clone the three files (`index.html`, `style.css`, `script.js`) into the same folder, along with an `assets/logo.png` for the header logo.
2. Open `index.html` in a browser, or serve the folder with any static file server (or GitHub Pages).
3. On first load you'll be prompted to sign up or log in — or just click **Try the demo** to look around instantly (see [Account Access](#account-access) below).
4. **As the teacher/admin:**
   - Go to the **Teacher** tab.
   - Click **Generate Session QR** so students can scan it to join.
   - Click **Start Scanner** and scan each student's attendance QR as they show it.
   - Use the **Records** tab to review, search, filter, and mark students out — or click **＋ Sample Data** to try it with pre-filled records.
   - Enter a class/org name in the export field and download the attendance as Excel.
5. **As a student:**
   - Scan the session QR shown by the admin.
   - Fill in ID, Name, Course, Year, and Section, then generate your attendance QR.
   - Show your generated QR to the admin's scanner to be recorded.

## Account Access

Sign-up requires a shared **access code**, set as `ACCESS_CODE` near the top of `script.js` (defaults to `ASTECH2026`). Change it before deploying, and share it only with people who should be able to create an account — this replaced an earlier email-allowlist approach that hardcoded real people's personal addresses into the public source.

For anyone who just wants to try the app, the built-in demo account (`demo@taptendance.app`) needs no code — reach it via the **Try the demo** button on the login screen.

Account credentials and attendance records are stored in the browser's `localStorage`, so they're local to the device/browser running the session. There's no sync between devices — a teacher who signs up on their phone will need to sign up again on a laptop. Solving that would require a real backend (e.g. Firebase Auth + Firestore), which this project intentionally doesn't have.

## Notes & Limitations

- **Client-side only:** there is no server, so accounts, sessions, and records all live in the browser's local storage on the device running the Teacher panel. Clearing browser data (or switching browsers/devices) will lose access to that data.
- **Camera access:** the scanner requires camera permissions; use "Test Camera Access" on the Teacher tab to troubleshoot.
- **No cross-device account sync:** by design — see [Account Access](#account-access).

## File Structure

```
.
├── index.html   # App markup (Teacher, Student, Records screens; auth & network modals)
├── style.css    # Styling and theme variables
├── script.js    # Auth, scanning, session, records, and export logic
└── assets/
    └── logo.png # Header logo (not included — add your own)
```
