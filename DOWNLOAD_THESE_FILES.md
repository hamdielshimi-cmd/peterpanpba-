# Files to Download - Quick Reference

## What to Download

You need **TWO FILES** from this repository:

### 1. **GAS_CODE_COPY_PASTE.js** ⭐ MOST IMPORTANT
This is the complete Google Apps Script code.

**What to do:**
- Download this file
- Go to https://script.google.com
- Open your Peter Pan Booking project
- Delete ALL existing code
- Copy entire contents of GAS_CODE_COPY_PASTE.js
- Paste into the Apps Script editor
- Update the `SPREADSHEET_ID` with your Google Sheet ID
- Deploy

### 2. **GAS_INSTALLATION_STEPS.md**
Step-by-step guide for installation.

**What to do:**
- Read this file for detailed installation instructions
- Follow each step carefully
- Use it for troubleshooting

## That's It!

These are the ONLY files you need to download and work with.

---

## File-by-File Breakdown

| File | Purpose | Action |
|------|---------|--------|
| `GAS_CODE_COPY_PASTE.js` | Google Apps Script code | Copy-paste into script.google.com |
| `GAS_INSTALLATION_STEPS.md` | Installation guide | Read and follow steps |
| `FIXES_SUMMARY.md` | What was fixed | Read for context |
| `client/src/pages/createShowPage.tsx` | Frontend (already working) | Don't need to do anything |
| `client/src/App.tsx` | Routing (already working) | Don't need to do anything |
| `client/src/pages/Show1-5.tsx` | Show pages (already working) | Don't need to do anything |

## 3 Things Fixed

✅ **Mobile seats layout** - Horizontal scroll now works (already deployed)

✅ **404 error** - Removed problematic script (already deployed)

⚠️ **Show-specific sheet mapping** - Requires GAS update (what you're doing now)

---

## Installation Summary

### Takes: ~5 minutes

1. Copy `GAS_CODE_COPY_PASTE.js`
2. Paste into script.google.com (replace all code)
3. Update SPREADSHEET_ID
4. Deploy as web app
5. Done!

---

## After You Deploy

All bookings will automatically go to the correct sheet:
- `/show1` → Show1 sheet
- `/show2` → Show2 sheet
- `/show3` → Show3 sheet
- `/show4` → Show4 sheet
- `/show5` → Show5 sheet

Admin can confirm/cancel pending bookings, and everything updates correctly.
