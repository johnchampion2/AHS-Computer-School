# AHS Computer School – Results Management System

## Folder
index.html · css/style.css · js/config.js · js/app.js · assets/images/ · backend/Code.gs

## Setup (10 minutes)
1. Replace `assets/images/school-logo.png` and `school-background.png` with your two school images (same filenames).
2. Create a Google Sheet > Extensions > Apps Script > paste `backend/Code.gs`.
3. Edit `MAIN_ADMIN` (name, username, password) at the top, then run `setupMainAdmin()` once and authorise.
   USERS and STUDENTS sheets are created automatically.
4. Deploy > New deployment > Web app > Execute as **Me**, Who has access **Anyone**. Copy the URL.
5. Paste the URL into `js/config.js` (`API_URL`).
6. Open the folder in VS Code and run with Live Server (or host on Netlify/GitHub Pages). Redeploy the script (new version) after any Code.gs change.

## Student access
Student ID alone is not secure, so students sign in with **Student ID + Access PIN**.
A 4-digit PIN is generated automatically when a student is first created and appears in the staff results table (PIN column). Give it to the student privately.

## Roles
Main Admin: everything + Admin Control Panel. Admin: enter/edit/delete/view/print. Tutor: enter/edit/view/print (no delete). Student: view own result only.
All permissions are checked in the backend.

## Install as an app (share the link)
Host the folder on any HTTPS host (Netlify, GitHub Pages, Vercel, Firebase Hosting) and share that link.
On the login page people see **Download the AHS App**. Android/Chrome/Edge install it in one tap; on iPhone use Safari > Share > Add to Home Screen.
The installed app is named AHS COMPUTER SCHOOL and uses the school logo (assets/icons/). It needs internet to load results.
