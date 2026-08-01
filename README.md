# Eco Scan Hospitals - Professional Diagnostic Appointment System

This is a full-stack hospital diagnostic scan booking website built with **React + Vite + Node.js + Express**.

It includes a professional hospital UI, separate **Admin Login** and **Patient Login**, patient appointment booking, **AI Scan Guide ChatBox**, admin booking notifications, and payment options for **Cash, UPI and Demo Razorpay**.

---

## Very Important: Easiest Way to Run

### For Windows

1. Extract the ZIP file.
2. Open the `ecoscan_project` folder.
3. Double-click:

```text
start-windows.bat
```

Or open terminal inside `ecoscan_project` and run:

```bash
npm start
```

The new `npm start` command automatically:

- installs backend packages if missing,
- installs frontend packages if missing,
- builds the frontend if needed,
- starts the full website.

Then open:

```text
http://localhost:5000
```

---

## Demo Login Details

### Admin Login

```text
Email: admin@ecoscan.com
Password: admin123
```

### Patient Login

```text
Email: patient@ecoscan.com
Password: patient123
```

---

## Main Features

- Professional real-hospital style landing page
- Separate Admin Login and Patient Login buttons
- Patient registration
- Patient dashboard
- Hospital search and filter
- Scan appointment booking
- Detailed patient appointment form with:
  - scan type,
  - appointment date and time,
  - patient name, phone and email,
  - age and gender,
  - emergency contact,
  - doctor/reference name,
  - department,
  - priority,
  - symptoms,
  - additional notes.
- Admin dashboard showing every patient booking with:
  - appointment ID,
  - date and time,
  - patient contact details,
  - hospital and scan details,
  - symptoms and notes,
  - status buttons: Confirm, Reject, Complete.
- Admin search and status filter
- Today schedule panel
- Hospital management
- Hospital availability control in admin page
- Booking is allowed only for hospitals marked Available for Booking
- Scan service management
- Reports and analytics
- AI ChatBox scan guidance based on symptoms/problem description
- Admin notification panel with unread booking alerts
- Admin notification settings for new booking alerts, browser popup, sound alert and UPI ID
- Cash at Hospital payment option
- UPI at Hospital payment option with configurable demo UPI ID
- Demo Razorpay payment flow for project demonstration, with no real money charged
- JSON database for easy college demo setup
- MySQL schema included for future migration

---

## Testing Steps

1. Open `http://localhost:5000`.
2. Click **Patient Login**.
3. Login with patient demo details.
4. Go to **Hospitals**.
5. Book any scan appointment.
6. Fill the date, time and patient details.
7. Submit the appointment.
8. Open **Patient Dashboard** to check the booking.
9. Logout.
10. Select **Cash**, **UPI**, or **Demo Razorpay** in the booking form.
11. Click **Admin Login**.
12. Open **Admin Dashboard**.
13. The patient booking will appear with date, time, patient details, payment mode and admin notification alert.
14. In **Manage Scan Services**, mark any hospital as **Not Available for Booking**.
15. Go to **Hospitals** and confirm the booking buttons are disabled for that hospital.
16. Mark the same hospital as **Available for Booking** to enable bookings again.
17. Click **AI Scan Guide** and type a symptom/problem such as “head injury after fall” or “abdominal pain” to see suggested scan guidance.

---

## Development Mode

Use this only after running `npm start` once or after running `npm run install-all`.

```bash
npm run dev
```

Then open:

```text
https://ecoscan-project-owjy.onrender.com/
```

Backend runs on:

```text
http://localhost:5000
```

---

## Manual Commands

```bash
npm run install-all
npm run build-frontend
npm start
```

---

## Folder Structure

```text
ecoscan_project/
  backend/
    server.js
    package.json
    data/
      db.json
  frontend/
    src/
      App.jsx
      main.jsx
      styles.css
    dist/
    package.json
    index.html
    vite.config.js
  database/
    mysql_schema.sql
  start-project.js
  start-windows.bat
  start-mac-linux.sh
  README.md
```

---

## Notes

- Make sure **Node.js 18 or above** is installed.
- Do not open `index.html` directly by double-clicking it. Always run the project through `npm start`.
- Data is saved in `backend/data/db.json`.
- If port 5000 is already used, stop the other program or change the `PORT` value.

---

## Newly Added Features

### AI Scan Guide ChatBox

- Floating **AI Scan Guide** button available on all pages.
- Patient can type symptoms/problem/disease concern.
- System suggests possible scan type such as MRI, CT Scan, X-Ray, Ultrasound or Mammography.
- Shows reason, urgency, preparation instructions and next steps.
- Includes a medical safety disclaimer that it is only for guidance and not a diagnosis.

### Admin Notifications

- Every new patient booking creates an admin notification.
- Admin dashboard shows unread booking alerts.
- Admin can mark all notifications as read.
- Admin can enable/disable new booking alerts, browser popup and sound alert.
- Browser notification permission is requested when enabled.

### Hospital Availability Control

- Admin can mark each hospital as **Available for Booking** or **Not Available for Booking**.
- Admin can add an availability note such as maintenance, fully booked, holiday, or temporary closure.
- Public hospital cards show the current availability status.
- Patients cannot book unavailable hospitals.
- Backend API also blocks booking and demo Razorpay order creation for unavailable hospitals.

### Payment Options

- **Cash at Hospital**
- **UPI at Hospital** with demo UPI ID: `ecoscan@upi`
- **Demo Razorpay** simulated checkout. No real payment is collected.

For production Razorpay integration, replace the demo flow with live Razorpay keys and server-side signature verification.
