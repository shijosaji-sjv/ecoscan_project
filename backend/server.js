const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'ecoscan_demo_secret_change_in_production';
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const DEMO_RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_ecoscan_demo';
const DEMO_UPI_ID = process.env.DEMO_UPI_ID || 'ecoscan@upi';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const uid = (prefix = '') => `${prefix}${crypto.randomBytes(6).toString('hex')}`;
const now = () => new Date().toISOString();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  const candidate = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(candidate));
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload) {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 8 }));
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

function initialDb() {
  const adminId = uid('usr_');
  const userId = uid('usr_');
  const h1 = uid('hsp_');
  const h2 = uid('hsp_');
  const h3 = uid('hsp_');
  return {
    users: [
      {
        id: adminId,
        name: 'Eco Scan Admin',
        email: 'admin@ecoscan.com',
        phone: '9876543210',
        passwordHash: hashPassword('admin123'),
        role: 'admin',
        createdAt: now()
      },
      {
        id: userId,
        name: 'Demo Patient',
        email: 'patient@ecoscan.com',
        phone: '9000011111',
        passwordHash: hashPassword('patient123'),
        role: 'user',
        createdAt: now()
      }
    ],
    hospitals: [
      {
        id: h1,
        name: 'Aster City Diagnostic Hospital',
        area: 'Whitefield',
        city: 'Bangalore',
        address: 'Outer Circle Road, Whitefield, Bangalore, Karnataka',
        phone: '+91 80455 12000',
        emergencyPhone: '+91 99880 11223',
        email: 'diagnostics@astercity.in',
        rating: 4.8,
        openHours: 'Mon-Sat 7:00 AM - 9:00 PM, Sun 8:00 AM - 2:00 PM',
        description: 'Multi-speciality hospital with advanced imaging, emergency support and quick scan reporting.',
        facilities: ['Emergency support', 'Wheelchair access', 'Digital reports', 'Insurance desk'],
        scans: [
          { id: uid('scn_'), name: 'MRI Scan', price: 6500, duration: '45 mins', preparation: 'Remove metal objects before scan' },
          { id: uid('scn_'), name: 'CT Scan', price: 4200, duration: '25 mins', preparation: 'Fasting may be needed for contrast scan' },
          { id: uid('scn_'), name: 'Ultrasound', price: 1600, duration: '20 mins', preparation: 'Drink water before abdominal ultrasound' }
        ],
        bookingAvailable: true,
        availabilityNote: 'Available for appointment bookings',
        active: true,
        createdAt: now()
      },
      {
        id: h2,
        name: 'Narayana Health Imaging Centre',
        area: 'Electronic City',
        city: 'Bangalore',
        address: 'Health City Main Road, Electronic City, Bangalore, Karnataka',
        phone: '+91 80278 35000',
        emergencyPhone: '+91 99777 22991',
        email: 'scanbookings@nhimaging.in',
        rating: 4.7,
        openHours: '24/7 Diagnostic Support',
        description: 'High-capacity diagnostic centre for MRI, CT, X-Ray and emergency scan support.',
        facilities: ['24/7 support', 'Ambulance bay', 'Senior radiologists', 'Report SMS alert'],
        scans: [
          { id: uid('scn_'), name: 'MRI Scan', price: 6000, duration: '40 mins', preparation: 'Carry previous reports if available' },
          { id: uid('scn_'), name: 'X-Ray', price: 600, duration: '10 mins', preparation: 'No special preparation required' },
          { id: uid('scn_'), name: 'Mammography', price: 2500, duration: '30 mins', preparation: 'Avoid deodorant on the day of test' }
        ],
        bookingAvailable: true,
        availabilityNote: 'Available for appointment bookings',
        active: true,
        createdAt: now()
      },
      {
        id: h3,
        name: 'Sparsh Care Scan Centre',
        area: 'Jayanagar',
        city: 'Bangalore',
        address: '4th Block, Jayanagar, Bangalore, Karnataka',
        phone: '+91 80612 44000',
        emergencyPhone: '+91 99112 34567',
        email: 'care@sparshscan.in',
        rating: 4.6,
        openHours: 'Mon-Sun 6:30 AM - 10:00 PM',
        description: 'Patient-friendly scan centre with transparent pricing and same-day report delivery.',
        facilities: ['Same-day reports', 'Parking', 'Home sample pickup', 'Online booking'],
        scans: [
          { id: uid('scn_'), name: 'CT Scan', price: 3900, duration: '25 mins', preparation: 'Follow staff instructions for contrast scans' },
          { id: uid('scn_'), name: 'Ultrasound', price: 1400, duration: '20 mins', preparation: 'Bladder full for pelvic scan' },
          { id: uid('scn_'), name: 'X-Ray', price: 500, duration: '10 mins', preparation: 'No special preparation required' }
        ],
        bookingAvailable: true,
        availabilityNote: 'Available for appointment bookings',
        active: true,
        createdAt: now()
      }
    ],
    bookings: [],
    notifications: [],
    adminSettings: {
      notifications: {
        newBooking: true,
        browser: true,
        sound: false,
        email: false,
        upiId: DEMO_UPI_ID,
        razorpayDemo: true
      }
    },
    auditLogs: [],
    createdAt: now()
  };
}

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(initialDb(), null, 2));
  }
}

function normalizeDb(db) {
  db.users = Array.isArray(db.users) ? db.users : [];
  db.hospitals = Array.isArray(db.hospitals) ? db.hospitals : [];
  db.bookings = Array.isArray(db.bookings) ? db.bookings : [];
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
  db.notifications = Array.isArray(db.notifications) ? db.notifications : [];
  db.adminSettings = db.adminSettings || {};
  db.adminSettings.notifications = {
    newBooking: true,
    browser: true,
    sound: false,
    email: false,
    upiId: DEMO_UPI_ID,
    razorpayDemo: true,
    ...(db.adminSettings.notifications || {})
  };
  db.hospitals.forEach((hospital) => {
    if (hospital.bookingAvailable === undefined) hospital.bookingAvailable = true;
    if (!hospital.availabilityNote) {
      hospital.availabilityNote = hospital.bookingAvailable ? 'Available for appointment bookings' : 'Temporarily not accepting bookings';
    }
  });
  db.bookings.forEach((booking) => {
    if (!booking.paymentMode) booking.paymentMode = booking.paymentStatus === 'Pay at Hospital' ? 'cash' : 'cash';
    if (!booking.paymentStatus) booking.paymentStatus = 'Pay at Hospital';
  });
  return db;
}

function readDb() {
  ensureDb();
  return normalizeDb(JSON.parse(fs.readFileSync(DB_PATH, 'utf8')));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(normalizeDb(db), null, 2));
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function auth(requiredRole = null) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Login required' });
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ message: 'Invalid or expired session' });
    const db = readDb();
    const user = db.users.find((u) => u.id === payload.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (requiredRole && user.role !== requiredRole) return res.status(403).json({ message: 'Access denied' });
    req.user = user;
    next();
  };
}

function enrichBooking(db, booking) {
  const user = db.users.find((u) => u.id === booking.userId);
  const hospital = db.hospitals.find((h) => h.id === booking.hospitalId);
  const scan = hospital?.scans.find((s) => s.id === booking.scanId);
  return {
    ...booking,
    user: publicUser(user),
    hospital: hospital ? { id: hospital.id, name: hospital.name, area: hospital.area, address: hospital.address, phone: hospital.phone, emergencyPhone: hospital.emergencyPhone } : null,
    scan: scan ? { id: scan.id, name: scan.name, price: scan.price, duration: scan.duration } : null
  };
}

function log(db, actorId, action, details) {
  db.auditLogs.unshift({ id: uid('log_'), actorId, action, details, createdAt: now() });
  db.auditLogs = db.auditLogs.slice(0, 200);
}

function createAdminNotification(db, payload) {
  const settings = db.adminSettings?.notifications || {};
  if (settings.newBooking === false && payload.type === 'new_booking') return;
  db.notifications.unshift({
    id: uid('ntf_'),
    type: payload.type || 'info',
    title: payload.title || 'Notification',
    message: payload.message || '',
    bookingId: payload.bookingId || '',
    priority: payload.priority || 'Normal',
    read: false,
    createdAt: now()
  });
  db.notifications = db.notifications.slice(0, 100);
}

const scanKnowledgeBase = [
  {
    scan: 'CT Scan',
    keywords: ['head injury', 'accident', 'trauma', 'stroke', 'bleeding', 'severe headache', 'chest injury', 'appendix', 'kidney stone'],
    reason: 'Useful for fast cross-sectional imaging, emergency injury assessment, suspected internal bleeding, stroke screening, kidney stones and some abdominal emergencies.',
    urgency: 'Urgent if symptoms are sudden, severe or linked with injury.',
    preparation: 'Fasting may be required for contrast CT. Carry previous reports and allergy details.'
  },
  {
    scan: 'MRI Scan',
    keywords: ['migraine', 'headache', 'seizure', 'brain', 'spine', 'back pain', 'disc', 'nerve', 'knee ligament', 'stroke follow up'],
    reason: 'Useful for detailed brain, spine, nerve, ligament and soft-tissue evaluation when the doctor needs high-detail images.',
    urgency: 'Routine to urgent depending on neurological symptoms.',
    preparation: 'Remove metal objects. Inform staff about implants, pacemaker, pregnancy or claustrophobia.'
  },
  {
    scan: 'X-Ray',
    keywords: ['fracture', 'bone pain', 'fall', 'chest pain', 'cough', 'pneumonia', 'dental', 'joint pain'],
    reason: 'Useful as a quick first-level scan for bones, chest infection screening and basic joint/chest assessment.',
    urgency: 'Quick check is advised after injury, fall or suspected fracture.',
    preparation: 'Usually no special preparation. Remove metal items from the scan area.'
  },
  {
    scan: 'Ultrasound',
    keywords: ['pregnancy', 'abdomen', 'stomach pain', 'pelvic pain', 'kidney', 'gall bladder', 'liver', 'thyroid', 'swelling', 'urine', 'prostate'],
    reason: 'Useful for abdomen, pregnancy, pelvic organs, kidney, liver, gall bladder, thyroid and fluid/swelling evaluation.',
    urgency: 'Routine unless severe abdominal pain, pregnancy bleeding or urinary obstruction is present.',
    preparation: 'Drink water for pelvic/urinary scans. Fasting may be needed for abdomen or gall bladder scans.'
  },
  {
    scan: 'Mammography',
    keywords: ['breast lump', 'breast pain', 'nipple discharge', 'breast screening', 'mammogram'],
    reason: 'Useful for breast screening and evaluation of breast lump, pain or suspicious changes as advised by a clinician.',
    urgency: 'Book promptly for new lump, nipple discharge or visible breast changes.',
    preparation: 'Avoid deodorant, powder or lotion on the day of test.'
  }
];

function getScanAdvice(symptoms = '') {
  const text = String(symptoms).toLowerCase();
  const scored = scanKnowledgeBase
    .map((item) => ({
      ...item,
      score: item.keywords.reduce((sum, keyword) => sum + (text.includes(keyword) ? 3 : keyword.split(' ').some((word) => text.includes(word)) ? 1 : 0), 0)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const emergencyWords = ['unconscious', 'severe bleeding', 'breathing difficulty', 'chest pain', 'stroke', 'paralysis', 'accident', 'head injury', 'seizure'];
  const emergency = emergencyWords.some((word) => text.includes(word));

  const recommendations = scored.length ? scored : [{
    scan: 'Doctor Consultation First',
    reason: 'The symptoms are not specific enough to safely suggest one scan. A doctor should examine the patient and decide whether MRI, CT, X-Ray, Ultrasound or lab tests are needed.',
    urgency: 'Book a consultation first unless symptoms are severe.',
    preparation: 'Carry previous reports, prescriptions and a clear symptom timeline.',
    score: 0
  }];

  return {
    disclaimer: 'This AI guide is for basic appointment guidance only. It is not a diagnosis and does not replace a doctor or emergency care.',
    emergency,
    emergencyText: emergency ? 'Some symptoms mentioned may need urgent medical attention. Please contact emergency services or visit the nearest hospital immediately.' : '',
    recommendations,
    nextSteps: [
      'Choose the suggested scan only after doctor advice if the case is not an emergency.',
      'Carry previous prescriptions, reports and ID proof to the scan centre.',
      'For contrast scans, inform the centre about allergies, kidney issues, pregnancy or implants.'
    ]
  };
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Eco Scan API', time: now() });
});

app.get('/api/config', (req, res) => {
  const db = readDb();
  res.json({
    upiId: db.adminSettings?.notifications?.upiId || DEMO_UPI_ID,
    razorpayDemo: db.adminSettings?.notifications?.razorpayDemo !== false,
    razorpayKeyId: DEMO_RAZORPAY_KEY_ID
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !phone || !password) return res.status(400).json({ message: 'Name, email, phone and password are required' });
  if (!validateEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
  if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const db = readDb();
  const exists = db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (exists) return res.status(409).json({ message: 'Email already registered' });
  const user = { id: uid('usr_'), name, email: String(email).toLowerCase(), phone, passwordHash: hashPassword(password), role: 'user', createdAt: now() };
  db.users.push(user);
  writeDb(db);
  const token = signToken({ id: user.id, role: user.role });
  res.status(201).json({ user: publicUser(user), token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ message: 'Invalid email or password' });
  const token = signToken({ id: user.id, role: user.role });
  res.json({ user: publicUser(user), token });
});

app.get('/api/me', auth(), (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get('/api/scan-types', (req, res) => {
  const db = readDb();
  const map = new Map();
  db.hospitals.filter((h) => h.active && h.bookingAvailable !== false).forEach((h) => h.scans.forEach((s) => map.set(s.name, { name: s.name, minPrice: Math.min(map.get(s.name)?.minPrice || Infinity, s.price) })));
  res.json([...map.values()].sort((a, b) => a.name.localeCompare(b.name)));
});

app.get('/api/hospitals', (req, res) => {
  const { scan = '', q = '', area = '' } = req.query;
  const scanLower = String(scan).toLowerCase();
  const qLower = String(q).toLowerCase();
  const areaLower = String(area).toLowerCase();
  const db = readDb();
  let hospitals = db.hospitals.filter((h) => h.active);
  if (scanLower) hospitals = hospitals.filter((h) => h.scans.some((s) => s.name.toLowerCase().includes(scanLower)));
  if (qLower) hospitals = hospitals.filter((h) => [h.name, h.area, h.city, h.address, h.description, h.availabilityNote, ...(h.facilities || [])].join(' ').toLowerCase().includes(qLower));
  if (areaLower) hospitals = hospitals.filter((h) => h.area.toLowerCase().includes(areaLower));
  res.json(hospitals.sort((a, b) => Number(b.bookingAvailable !== false) - Number(a.bookingAvailable !== false) || b.rating - a.rating));
});

app.get('/api/hospitals/:id', (req, res) => {
  const db = readDb();
  const hospital = db.hospitals.find((h) => h.id === req.params.id && h.active);
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  res.json(hospital);
});

app.post('/api/ai/scan-advice', (req, res) => {
  const { symptoms = '', patientAge = '', gender = '' } = req.body || {};
  if (!String(symptoms).trim()) return res.status(400).json({ message: 'Please enter symptoms or health concern to get scan guidance' });
  const db = readDb();
  const advice = getScanAdvice(symptoms);
  const suggestedScanNames = advice.recommendations.map((item) => item.scan).filter((name) => name !== 'Doctor Consultation First');
  const matchingHospitals = db.hospitals
    .filter((hospital) => hospital.active && hospital.bookingAvailable !== false && hospital.scans.some((scan) => suggestedScanNames.includes(scan.name)))
    .slice(0, 5)
    .map((hospital) => ({
      id: hospital.id,
      name: hospital.name,
      area: hospital.area,
      rating: hospital.rating,
      scans: hospital.scans.filter((scan) => suggestedScanNames.includes(scan.name)).map((scan) => ({ id: scan.id, name: scan.name, price: scan.price, duration: scan.duration }))
    }));
  res.json({ ...advice, patientAge, gender, matchingHospitals });
});

app.post('/api/payments/razorpay/demo-order', auth(), (req, res) => {
  const { hospitalId, scanId } = req.body || {};
  const db = readDb();
  const hospital = db.hospitals.find((h) => h.id === hospitalId && h.active);
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  if (hospital.bookingAvailable === false) return res.status(400).json({ message: `${hospital.name} is currently not available for booking. ${hospital.availabilityNote || 'Please choose another hospital.'}` });
  const scan = hospital.scans.find((s) => s.id === scanId);
  if (!scan) return res.status(404).json({ message: 'Scan service not found' });
  res.json({
    provider: 'Razorpay Demo',
    keyId: DEMO_RAZORPAY_KEY_ID,
    orderId: uid('order_demo_'),
    amount: Number(scan.price || 0) * 100,
    displayAmount: Number(scan.price || 0),
    currency: 'INR',
    hospitalName: hospital.name,
    scanName: scan.name,
    message: 'Demo Razorpay order created. No real money is charged in this project.'
  });
});

app.post('/api/bookings', auth(), (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ message: 'Only patient accounts can create appointment requests' });
  const {
    hospitalId, scanId, date, time, patientName, patientPhone,
    patientEmail = req.user.email, patientAge = '', gender = '', emergencyContact = '',
    doctorName = '', department = 'Radiology', priority = 'Normal', symptoms = '', notes = '',
    paymentMode = 'cash', paymentReference = '', paymentOrderId = ''
  } = req.body;
  if (!hospitalId || !scanId || !date || !time || !patientName || !patientPhone) {
    return res.status(400).json({ message: 'Hospital, scan, date, time, patient name and phone are required' });
  }
  const allowedPaymentModes = ['cash', 'upi', 'razorpay_demo'];
  if (!allowedPaymentModes.includes(paymentMode)) return res.status(400).json({ message: 'Invalid payment option selected' });
  if (patientEmail && !validateEmail(patientEmail)) return res.status(400).json({ message: 'Enter a valid patient email address' });
  const selectedDate = new Date(`${date}T${time}`);
  if (Number.isNaN(selectedDate.getTime())) return res.status(400).json({ message: 'Invalid appointment date or time' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) return res.status(400).json({ message: 'Appointment cannot be booked for a past date' });
  const db = readDb();
  const hospital = db.hospitals.find((h) => h.id === hospitalId && h.active);
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  if (hospital.bookingAvailable === false) return res.status(400).json({ message: `${hospital.name} is currently not available for booking. ${hospital.availabilityNote || 'Please choose another hospital.'}` });
  const scan = hospital.scans.find((s) => s.id === scanId);
  if (!scan) return res.status(404).json({ message: 'Scan service not found in this hospital' });
  const duplicate = db.bookings.find((b) => b.hospitalId === hospitalId && b.scanId === scanId && b.date === date && b.time === time && ['Pending', 'Confirmed'].includes(b.status));
  if (duplicate) return res.status(409).json({ message: 'This slot is already requested. Please choose another time.' });
  const activeUpiId = db.adminSettings?.notifications?.upiId || DEMO_UPI_ID;
  const booking = {
    id: uid('apt_'),
    userId: req.user.id,
    hospitalId,
    scanId,
    date,
    time,
    patientName,
    patientPhone,
    patientEmail,
    patientAge,
    gender,
    emergencyContact,
    doctorName,
    department,
    priority,
    symptoms,
    notes,
    status: 'Pending',
    paymentMode,
    paymentStatus: paymentMode === 'cash' ? 'Cash at Hospital' : paymentMode === 'upi' ? `UPI at Hospital (${activeUpiId})` : 'Paid via Razorpay Demo',
    paymentReference: paymentMode === 'razorpay_demo' ? paymentReference : '',
    paymentOrderId: paymentMode === 'razorpay_demo' ? paymentOrderId : '',
    paymentProvider: paymentMode === 'razorpay_demo' ? 'Razorpay Demo' : paymentMode === 'upi' ? 'UPI' : 'Cash',
    createdAt: now(),
    updatedAt: now()
  };
  db.bookings.unshift(booking);
  log(db, req.user.id, 'BOOKING_CREATED', { bookingId: booking.id, hospitalId, scanId, date, time, priority, paymentMode });
  createAdminNotification(db, {
    type: 'new_booking',
    title: 'New patient appointment booked',
    message: `${patientName} booked ${scan.name} at ${hospital.name} for ${date} ${time}. Payment: ${booking.paymentStatus}.`,
    bookingId: booking.id,
    priority
  });
  writeDb(db);
  res.status(201).json(enrichBooking(db, booking));
});

app.get('/api/bookings/my', auth(), (req, res) => {
  const db = readDb();
  const bookings = db.bookings.filter((b) => b.userId === req.user.id).map((b) => enrichBooking(db, b));
  res.json(bookings);
});

app.delete('/api/bookings/:id', auth(), (req, res) => {
  const db = readDb();
  const booking = db.bookings.find((b) => b.id === req.params.id && b.userId === req.user.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.status === 'Confirmed') return res.status(400).json({ message: 'Confirmed booking cannot be cancelled online. Contact hospital support.' });
  booking.status = 'Cancelled';
  booking.updatedAt = now();
  log(db, req.user.id, 'BOOKING_CANCELLED', { bookingId: booking.id });
  writeDb(db);
  res.json(enrichBooking(db, booking));
});

app.get('/api/admin/stats', auth('admin'), (req, res) => {
  const db = readDb();
  const pending = db.bookings.filter((b) => b.status === 'Pending').length;
  const confirmed = db.bookings.filter((b) => b.status === 'Confirmed').length;
  const rejected = db.bookings.filter((b) => b.status === 'Rejected').length;
  const revenue = db.bookings.filter((b) => b.status === 'Confirmed').reduce((sum, booking) => {
    const hospital = db.hospitals.find((h) => h.id === booking.hospitalId);
    const scan = hospital?.scans.find((s) => s.id === booking.scanId);
    return sum + Number(scan?.price || 0);
  }, 0);
  res.json({
    users: db.users.filter((u) => u.role === 'user').length,
    hospitals: db.hospitals.filter((h) => h.active).length,
    availableHospitals: db.hospitals.filter((h) => h.active && h.bookingAvailable !== false).length,
    unavailableHospitals: db.hospitals.filter((h) => h.active && h.bookingAvailable === false).length,
    bookings: db.bookings.length,
    pending,
    confirmed,
    rejected,
    revenue,
    unreadNotifications: db.notifications.filter((n) => !n.read).length
  });
});

app.get('/api/admin/bookings', auth('admin'), (req, res) => {
  const db = readDb();
  const bookings = db.bookings.map((b) => enrichBooking(db, b));
  res.json(bookings);
});

app.patch('/api/admin/bookings/:id/status', auth('admin'), (req, res) => {
  const { status } = req.body;
  if (!['Pending', 'Confirmed', 'Rejected', 'Completed'].includes(status)) return res.status(400).json({ message: 'Invalid booking status' });
  const db = readDb();
  const booking = db.bookings.find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  booking.status = status;
  booking.updatedAt = now();
  log(db, req.user.id, 'BOOKING_STATUS_UPDATED', { bookingId: booking.id, status });
  writeDb(db);
  res.json(enrichBooking(db, booking));
});

app.get('/api/admin/notifications', auth('admin'), (req, res) => {
  const db = readDb();
  res.json({
    notifications: db.notifications,
    settings: db.adminSettings.notifications,
    unread: db.notifications.filter((item) => !item.read).length
  });
});

app.patch('/api/admin/notifications/read', auth('admin'), (req, res) => {
  const { ids = [], all = false } = req.body || {};
  const db = readDb();
  db.notifications.forEach((item) => {
    if (all || ids.includes(item.id)) item.read = true;
  });
  writeDb(db);
  res.json({ notifications: db.notifications, unread: db.notifications.filter((item) => !item.read).length });
});

app.patch('/api/admin/notifications/settings', auth('admin'), (req, res) => {
  const db = readDb();
  const current = db.adminSettings.notifications || {};
  const allowed = ['newBooking', 'browser', 'sound', 'email', 'upiId', 'razorpayDemo'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) current[key] = typeof current[key] === 'boolean' ? Boolean(req.body[key]) : req.body[key];
  });
  db.adminSettings.notifications = current;
  log(db, req.user.id, 'NOTIFICATION_SETTINGS_UPDATED', current);
  writeDb(db);
  res.json(current);
});

app.get('/api/admin/users', auth('admin'), (req, res) => {
  const db = readDb();
  res.json(db.users.map(publicUser));
});

app.post('/api/admin/hospitals', auth('admin'), (req, res) => {
  const { name, area, city = 'Bangalore', address, phone, emergencyPhone = '', email = '', rating = 4.5, openHours = '', description = '', facilities = [], scans = [], bookingAvailable = true, availabilityNote = '' } = req.body;
  if (!name || !area || !address || !phone) return res.status(400).json({ message: 'Hospital name, area, address and phone are required' });
  const cleanScans = Array.isArray(scans) ? scans.filter((s) => s.name && s.price).map((s) => ({ id: uid('scn_'), name: s.name, price: Number(s.price), duration: s.duration || '20 mins', preparation: s.preparation || 'Follow hospital instructions' })) : [];
  const db = readDb();
  const hospital = {
    id: uid('hsp_'), name, area, city, address, phone, emergencyPhone, email, rating: Number(rating), openHours, description,
    facilities: Array.isArray(facilities) ? facilities : String(facilities || '').split(',').map((f) => f.trim()).filter(Boolean),
    scans: cleanScans,
    bookingAvailable: bookingAvailable !== false,
    availabilityNote: availabilityNote || (bookingAvailable !== false ? 'Available for appointment bookings' : 'Temporarily not accepting bookings'),
    active: true,
    createdAt: now()
  };
  db.hospitals.unshift(hospital);
  log(db, req.user.id, 'HOSPITAL_CREATED', { hospitalId: hospital.id });
  writeDb(db);
  res.status(201).json(hospital);
});

app.put('/api/admin/hospitals/:id', auth('admin'), (req, res) => {
  const db = readDb();
  const hospital = db.hospitals.find((h) => h.id === req.params.id);
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  const allowed = ['name', 'area', 'city', 'address', 'phone', 'emergencyPhone', 'email', 'rating', 'openHours', 'description', 'facilities', 'active', 'bookingAvailable', 'availabilityNote'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) hospital[key] = key === 'rating' ? Number(req.body[key]) : req.body[key];
  });
  hospital.updatedAt = now();
  log(db, req.user.id, 'HOSPITAL_UPDATED', { hospitalId: hospital.id });
  writeDb(db);
  res.json(hospital);
});

app.patch('/api/admin/hospitals/:id/availability', auth('admin'), (req, res) => {
  const { bookingAvailable, availabilityNote = '' } = req.body || {};
  if (typeof bookingAvailable !== 'boolean') return res.status(400).json({ message: 'bookingAvailable must be true or false' });
  const db = readDb();
  const hospital = db.hospitals.find((h) => h.id === req.params.id);
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  hospital.bookingAvailable = bookingAvailable;
  hospital.availabilityNote = String(availabilityNote || '').trim() || (bookingAvailable ? 'Available for appointment bookings' : 'Temporarily not accepting bookings');
  hospital.availabilityUpdatedAt = now();
  hospital.updatedAt = now();
  log(db, req.user.id, 'HOSPITAL_AVAILABILITY_UPDATED', { hospitalId: hospital.id, bookingAvailable, availabilityNote: hospital.availabilityNote });
  writeDb(db);
  res.json(hospital);
});

app.delete('/api/admin/hospitals/:id', auth('admin'), (req, res) => {
  const db = readDb();
  const hospital = db.hospitals.find((h) => h.id === req.params.id);
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  hospital.active = false;
  hospital.updatedAt = now();
  log(db, req.user.id, 'HOSPITAL_DEACTIVATED', { hospitalId: hospital.id });
  writeDb(db);
  res.json({ message: 'Hospital removed from public listing', hospital });
});

app.post('/api/admin/hospitals/:id/scans', auth('admin'), (req, res) => {
  const { name, price, duration = '20 mins', preparation = 'Follow hospital instructions' } = req.body;
  if (!name || !price) return res.status(400).json({ message: 'Scan name and price are required' });
  const db = readDb();
  const hospital = db.hospitals.find((h) => h.id === req.params.id);
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  const scan = { id: uid('scn_'), name, price: Number(price), duration, preparation };
  hospital.scans.push(scan);
  hospital.updatedAt = now();
  log(db, req.user.id, 'SCAN_ADDED', { hospitalId: hospital.id, scanId: scan.id });
  writeDb(db);
  res.status(201).json(scan);
});

app.delete('/api/admin/hospitals/:hospitalId/scans/:scanId', auth('admin'), (req, res) => {
  const db = readDb();
  const hospital = db.hospitals.find((h) => h.id === req.params.hospitalId);
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  const before = hospital.scans.length;
  hospital.scans = hospital.scans.filter((s) => s.id !== req.params.scanId);
  if (hospital.scans.length === before) return res.status(404).json({ message: 'Scan service not found' });
  hospital.updatedAt = now();
  log(db, req.user.id, 'SCAN_REMOVED', { hospitalId: hospital.id, scanId: req.params.scanId });
  writeDb(db);
  res.json({ message: 'Scan service removed', hospital });
});

app.get('/api/admin/reports', auth('admin'), (req, res) => {
  const db = readDb();
  const bookings = db.bookings.map((b) => enrichBooking(db, b));
  const hospitalWise = {};
  const scanWise = {};
  bookings.forEach((b) => {
    const hospitalName = b.hospital?.name || 'Unknown';
    const scanName = b.scan?.name || 'Unknown';
    hospitalWise[hospitalName] = (hospitalWise[hospitalName] || 0) + 1;
    scanWise[scanName] = (scanWise[scanName] || 0) + 1;
  });
  res.json({ bookings, hospitalWise, scanWise, generatedAt: now() });
});


// Serve the React frontend in production or when frontend/dist is available.
// This lets beginners open only http://localhost:5000 and see the full UI.
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
      return res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
    }
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send(`
      <h1>Eco Scan Backend Running</h1>
      <p>Frontend build was not found.</p>
      <p>Run <code>npm run build-frontend</code> from the project folder, then restart the backend.</p>
      <p>API Health: <a href="/api/health">/api/health</a></p>
    `);
  });
}


app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
});

ensureDb();
app.listen(PORT, () => {
  console.log(`Eco Scan API running on http://localhost:${PORT}`);
  console.log('Demo admin: admin@ecoscan.com / admin123');
  console.log('Demo patient: patient@ecoscan.com / patient123');
});
