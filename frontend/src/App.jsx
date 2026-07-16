import { useEffect, useMemo, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const today = new Date().toISOString().split('T')[0];
const DEFAULT_NOTIFICATION_SETTINGS = { newBooking: true, browser: true, sound: false, email: false, upiId: 'ecoscan@upi', razorpayDemo: true };

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem('ecoscan_session') || '{}');
  } catch {
    return {};
  }
}

function saveSession(session) {
  localStorage.setItem('ecoscan_session', JSON.stringify(session));
}

function currency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

function readableDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function readableDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function StatusBadge({ status }) {
  return <span className={`status ${String(status).toLowerCase()}`}>{status}</span>;
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">🏥</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function isHospitalBookable(hospital) {
  return hospital?.bookingAvailable !== false;
}

function availabilityLabel(hospital) {
  return isHospitalBookable(hospital) ? 'Available for Booking' : 'Not Available for Booking';
}

function Detail({ icon, label, value }) {
  return (
    <div className="detail-item">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value || '-'}</strong>
      </div>
    </div>
  );
}

export default function App() {
  const stored = getStoredSession();
  const [token, setToken] = useState(stored.token || '');
  const [user, setUser] = useState(stored.user || null);
  const [activeTab, setActiveTab] = useState('home');
  const [hospitals, setHospitals] = useState([]);
  const [scanTypes, setScanTypes] = useState([]);
  const [filters, setFilters] = useState({ scan: '', q: '', area: '' });
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('patient-login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [bookingHospital, setBookingHospital] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    scanId: '', date: today, time: '10:00', patientName: user?.name || '', patientPhone: user?.phone || '', patientEmail: user?.email || '',
    patientAge: '', gender: '', emergencyContact: '', doctorName: '', department: 'Radiology', priority: 'Normal', symptoms: '', notes: '', paymentMode: 'cash'
  });
  const [myBookings, setMyBookings] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [adminBookings, setAdminBookings] = useState([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('All');
  const [report, setReport] = useState(null);
  const [hospitalForm, setHospitalForm] = useState({
    name: '', area: '', city: 'Bangalore', address: '', phone: '', emergencyPhone: '', email: '', rating: 4.5,
    openHours: 'Mon-Sat 7:00 AM - 9:00 PM', description: '', facilities: 'Emergency support, Digital reports, Insurance desk, Wheelchair access',
    bookingAvailable: true, availabilityNote: 'Available for appointment bookings',
    scanName: 'MRI Scan', scanPrice: 5000, scanDuration: '30 mins', scanPreparation: 'Follow hospital instructions'
  });
  const [newScan, setNewScan] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [publicConfig, setPublicConfig] = useState({ upiId: 'ecoscan@upi', razorpayDemo: true });
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hello! Tell me the patient problem or symptoms, and I will suggest the possible scan type to discuss with a doctor.' }
  ]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const latestNotifiedIdRef = useRef('');

  const isAdmin = user?.role === 'admin';
  const unreadNotificationCount = notifications.filter((item) => !item.read).length;
  const selectedBookingScan = bookingHospital?.scans.find((scan) => scan.id === bookingForm.scanId) || bookingHospital?.scans?.[0];
  const selectedHospitalBookable = isHospitalBookable(bookingHospital);

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Something went wrong');
    return data;
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    window.clearTimeout(showMessage.timer);
    showMessage.timer = window.setTimeout(() => setMessage({ type: '', text: '' }), 4200);
  }

  function playNotificationSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.frequency.value = 880;
      gain.gain.value = 0.04;
      oscillator.start();
      window.setTimeout(() => { oscillator.stop(); audioContext.close(); }, 220);
    } catch {
      // Browser may block audio until the admin interacts with the page.
    }
  }

  function triggerAdminAlert(notification, settings = notificationSettings) {
    if (!notification || notification.id === latestNotifiedIdRef.current) return;
    latestNotifiedIdRef.current = notification.id;
    if (settings.sound) playNotificationSound();
    if (settings.browser && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.message });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') new Notification(notification.title, { body: notification.message });
        });
      }
    }
    showMessage('success', notification.message);
  }

  function openLogin(mode) {
    setAuthMode(mode);
    setAuthOpen(true);
    setAuthForm((prev) => ({
      ...prev,
      name: '',
      phone: '',
      email: mode === 'admin-login' ? 'admin@ecoscan.com' : mode === 'patient-login' ? 'patient@ecoscan.com' : '',
      password: mode === 'admin-login' ? 'admin123' : mode === 'patient-login' ? 'patient123' : ''
    }));
  }

  async function loadPublicData() {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    const [hospitalData, scanData, configData] = await Promise.all([
      fetch(`${API_URL}/hospitals?${params}`).then((res) => res.json()),
      fetch(`${API_URL}/scan-types`).then((res) => res.json()),
      fetch(`${API_URL}/config`).then((res) => res.json()).catch(() => ({}))
    ]);
    setHospitals(Array.isArray(hospitalData) ? hospitalData : []);
    setScanTypes(Array.isArray(scanData) ? scanData : []);
    setPublicConfig({ upiId: configData.upiId || 'ecoscan@upi', razorpayDemo: configData.razorpayDemo !== false });
  }

  async function loadMyBookings() {
    if (!token || !user || user.role !== 'user') return;
    try {
      setMyBookings(await api('/bookings/my'));
    } catch (error) {
      showMessage('error', error.message);
    }
  }

  async function loadAdminData() {
    if (!token || !isAdmin) return;
    try {
      const [stats, bookings, reports, noticeData] = await Promise.all([
        api('/admin/stats'),
        api('/admin/bookings'),
        api('/admin/reports'),
        api('/admin/notifications')
      ]);
      setAdminStats(stats);
      setAdminBookings(bookings);
      setReport(reports);
      setNotifications(noticeData.notifications || []);
      setNotificationSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...(noticeData.settings || {}) });
      const latestUnread = (noticeData.notifications || []).find((item) => !item.read);
      if (latestUnread && noticeData.settings?.newBooking !== false) triggerAdminAlert(latestUnread, { ...DEFAULT_NOTIFICATION_SETTINGS, ...(noticeData.settings || {}) });
    } catch (error) {
      showMessage('error', error.message);
    }
  }

  useEffect(() => {
    loadPublicData().catch((error) => showMessage('error', `Backend not connected: ${error.message}`));
  }, [filters.scan, filters.area]);

  useEffect(() => {
    if (user?.role === 'user') loadMyBookings();
    if (user?.role === 'admin') loadAdminData();
  }, [token, user?.role]);

  useEffect(() => {
    if (!token || !isAdmin) return undefined;
    const timer = window.setInterval(() => loadAdminData(), 12000);
    return () => window.clearInterval(timer);
  }, [token, isAdmin]);

  const visibleHospitals = useMemo(() => {
    const term = filters.q.trim().toLowerCase();
    if (!term) return hospitals;
    return hospitals.filter((h) => [h.name, h.area, h.city, h.address, h.description, h.availabilityNote, ...(h.facilities || [])].join(' ').toLowerCase().includes(term));
  }, [hospitals, filters.q]);

  const filteredAdminBookings = useMemo(() => {
    const term = adminSearch.trim().toLowerCase();
    return adminBookings.filter((booking) => {
      const matchesStatus = adminStatusFilter === 'All' || booking.status === adminStatusFilter;
      const haystack = [
        booking.patientName, booking.patientPhone, booking.patientEmail, booking.patientAge, booking.gender,
        booking.doctorName, booking.priority, booking.department, booking.hospital?.name, booking.hospital?.area,
        booking.scan?.name, booking.symptoms, booking.notes, booking.date, booking.time
      ].join(' ').toLowerCase();
      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [adminBookings, adminSearch, adminStatusFilter]);

  const todayBookings = adminBookings.filter((booking) => booking.date === today && ['Pending', 'Confirmed'].includes(booking.status));

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
      const payload = authMode === 'register' ? authForm : { email: authForm.email, password: authForm.password };
      const session = await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      if (authMode === 'admin-login' && session.user.role !== 'admin') throw new Error('Please use an admin account for Admin Login.');
      if (authMode === 'patient-login' && session.user.role !== 'user') throw new Error('Please use a patient account for Patient Login.');
      setUser(session.user);
      setToken(session.token);
      saveSession(session);
      setAuthOpen(false);
      showMessage('success', `Welcome ${session.user.name}`);
      if (session.user.role === 'admin') setActiveTab('admin');
      else setActiveTab('hospitals');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('ecoscan_session');
    setUser(null);
    setToken('');
    setMyBookings([]);
    setAdminStats(null);
    setAdminBookings([]);
    setActiveTab('home');
    showMessage('success', 'Logged out successfully');
  }

  function startBooking(hospital, scanId = '') {
    if (!user) {
      openLogin('patient-login');
      showMessage('error', 'Please login as patient to book an appointment');
      return;
    }
    if (user.role === 'admin') {
      showMessage('error', 'Admin account cannot create patient booking');
      return;
    }
    if (!isHospitalBookable(hospital)) {
      showMessage('error', `${hospital.name} is currently not available for booking. ${hospital.availabilityNote || 'Please choose another hospital.'}`);
      return;
    }
    setBookingHospital(hospital);
    setBookingForm({
      scanId: scanId || hospital.scans[0]?.id || '', date: today, time: '10:00', patientName: user?.name || '', patientPhone: user?.phone || '', patientEmail: user?.email || '',
      patientAge: '', gender: '', emergencyContact: '', doctorName: '', department: 'Radiology', priority: 'Normal', symptoms: '', notes: '', paymentMode: 'cash'
    });
  }

  async function submitBooking(event) {
    event.preventDefault();
    setLoading(true);
    try {
      if (!selectedHospitalBookable) throw new Error(`${bookingHospital.name} is currently not available for booking. ${bookingHospital.availabilityNote || 'Please choose another hospital.'}`);
      let paymentOrderId = '';
      let paymentReference = '';
      if (bookingForm.paymentMode === 'razorpay_demo') {
        const order = await api('/payments/razorpay/demo-order', {
          method: 'POST',
          body: JSON.stringify({ hospitalId: bookingHospital.id, scanId: bookingForm.scanId })
        });
        const confirmed = window.confirm(`Demo Razorpay Checkout\n\n${order.scanName} at ${order.hospitalName}\nAmount: ${currency(order.displayAmount)}\nOrder ID: ${order.orderId}\n\nClick OK to simulate successful Razorpay payment.`);
        if (!confirmed) throw new Error('Demo Razorpay payment was cancelled');
        paymentOrderId = order.orderId;
        paymentReference = `pay_demo_${Date.now()}`;
      }
      const booking = await api('/bookings', {
        method: 'POST',
        body: JSON.stringify({ ...bookingForm, hospitalId: bookingHospital.id, paymentOrderId, paymentReference })
      });
      setBookingHospital(null);
      showMessage('success', `Appointment submitted. ${booking.paymentStatus}. Status: ${booking.status}`);
      setActiveTab('my-bookings');
      await loadMyBookings();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking(id) {
    if (!confirm('Cancel this booking request?')) return;
    try {
      await api(`/bookings/${id}`, { method: 'DELETE' });
      showMessage('success', 'Booking cancelled');
      await loadMyBookings();
    } catch (error) {
      showMessage('error', error.message);
    }
  }

  async function updateBookingStatus(id, status) {
    try {
      await api(`/admin/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      showMessage('success', `Booking marked as ${status}`);
      await loadAdminData();
    } catch (error) {
      showMessage('error', error.message);
    }
  }

  async function addHospital(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...hospitalForm,
        facilities: hospitalForm.facilities.split(',').map((item) => item.trim()).filter(Boolean),
        scans: [{ name: hospitalForm.scanName, price: Number(hospitalForm.scanPrice), duration: hospitalForm.scanDuration, preparation: hospitalForm.scanPreparation }]
      };
      await api('/admin/hospitals', { method: 'POST', body: JSON.stringify(payload) });
      showMessage('success', 'Hospital added successfully');
      setHospitalForm({ ...hospitalForm, name: '', area: '', address: '', phone: '', emergencyPhone: '', email: '', description: '', bookingAvailable: true, availabilityNote: 'Available for appointment bookings' });
      await loadPublicData();
      await loadAdminData();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteHospital(id) {
    if (!confirm('Remove this hospital from public listing?')) return;
    try {
      await api(`/admin/hospitals/${id}`, { method: 'DELETE' });
      showMessage('success', 'Hospital removed');
      await loadPublicData();
      await loadAdminData();
    } catch (error) {
      showMessage('error', error.message);
    }
  }

  async function updateHospitalAvailability(hospital, bookingAvailable) {
    const availabilityNote = bookingAvailable ? 'Available for appointment bookings' : (hospital.availabilityNote || 'Temporarily not accepting bookings');
    try {
      await api(`/admin/hospitals/${hospital.id}/availability`, { method: 'PATCH', body: JSON.stringify({ bookingAvailable, availabilityNote }) });
      showMessage('success', `${hospital.name} marked as ${bookingAvailable ? 'available' : 'not available'} for booking`);
      await loadPublicData();
      await loadAdminData();
    } catch (error) {
      showMessage('error', error.message);
    }
  }

  function editAvailabilityNote(hospitalId, availabilityNote) {
    setHospitals((prev) => prev.map((item) => item.id === hospitalId ? { ...item, availabilityNote } : item));
  }

  async function saveAvailabilityNote(hospital) {
    try {
      await api(`/admin/hospitals/${hospital.id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ bookingAvailable: isHospitalBookable(hospital), availabilityNote: hospital.availabilityNote || '' })
      });
      showMessage('success', 'Availability note saved');
      await loadPublicData();
    } catch (error) {
      showMessage('error', error.message);
    }
  }

  async function addScan(hospitalId) {
    const form = newScan[hospitalId] || {};
    try {
      await api(`/admin/hospitals/${hospitalId}/scans`, { method: 'POST', body: JSON.stringify(form) });
      showMessage('success', 'Scan service added');
      setNewScan((prev) => ({ ...prev, [hospitalId]: {} }));
      await loadPublicData();
    } catch (error) {
      showMessage('error', error.message);
    }
  }

  async function deleteScan(hospitalId, scanId) {
    try {
      await api(`/admin/hospitals/${hospitalId}/scans/${scanId}`, { method: 'DELETE' });
      showMessage('success', 'Scan service removed');
      await loadPublicData();
    } catch (error) {
      showMessage('error', error.message);
    }
  }

  async function askScanAssistant(event) {
    event.preventDefault();
    const question = chatInput.trim();
    if (!question) return;
    setChatMessages((prev) => [...prev, { role: 'user', text: question }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const advice = await api('/ai/scan-advice', { method: 'POST', body: JSON.stringify({ symptoms: question }) });
      setChatMessages((prev) => [...prev, {
        role: 'assistant',
        text: advice.emergency ? advice.emergencyText : 'Here is the scan guidance based on the symptoms entered. Please confirm with a doctor before booking.',
        advice
      }]);
    } catch (error) {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: error.message }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function markNotificationsRead() {
    try {
      await api('/admin/notifications/read', { method: 'PATCH', body: JSON.stringify({ all: true }) });
      await loadAdminData();
      showMessage('success', 'Notifications marked as read');
    } catch (error) {
      showMessage('error', error.message);
    }
  }

  async function saveNotificationSettings(nextSettings) {
    const updated = { ...notificationSettings, ...nextSettings };
    setNotificationSettings(updated);
    try {
      await api('/admin/notifications/settings', { method: 'PATCH', body: JSON.stringify(updated) });
      showMessage('success', 'Notification settings updated');
    } catch (error) {
      showMessage('error', error.message);
    }
  }

  function applyScanFromAssistant(scanName) {
    setFilters((prev) => ({ ...prev, scan: scanName }));
    setActiveTab('hospitals');
    setChatOpen(false);
  }

  function navButton(tab, label) {
    return <button className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{label}</button>;
  }

  const authTitle = authMode === 'admin-login' ? 'Admin Login' : authMode === 'register' ? 'Create Patient Account' : 'Patient Login';
  const authSubtitle = authMode === 'admin-login' ? 'Hospital staff access only' : authMode === 'register' ? 'Register to book appointments online' : 'Book, track and manage your scan requests';

  return (
    <main>
      <header className="topbar">
        <div className="brand" onClick={() => setActiveTab('home')}>
          <div className="brand-icon">✚</div>
          <div>
            <strong>Eco Scan Hospitals</strong>
            <small>Advanced Diagnostic Appointment System</small>
          </div>
        </div>
        <nav>
          {navButton('home', 'Home')}
          {navButton('hospitals', 'Hospitals')}
          <button onClick={() => setChatOpen(true)}>AI Scan Guide</button>
          {user?.role === 'user' && navButton('my-bookings', 'Patient Dashboard')}
          {isAdmin && navButton('admin', 'Admin Dashboard')}
        </nav>
        <div className="user-box">
          {user ? (
            <>
              <span>{user.role === 'admin' ? 'Admin' : 'Patient'}: <b>{user.name}</b></span>
              {isAdmin && <button className="notification-bell" onClick={() => { setNotificationOpen((value) => !value); setActiveTab('admin'); }}>🔔{unreadNotificationCount > 0 && <b>{unreadNotificationCount}</b>}</button>}
              <button className="ghost-btn" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <button className="ghost-btn login-choice" onClick={() => openLogin('admin-login')}>Admin Login</button>
              <button className="primary-btn small" onClick={() => openLogin('patient-login')}>Patient Login</button>
            </>
          )}
        </div>
      </header>

      {message.text && <div className={`toast ${message.type}`}>{message.text}</div>}

      {activeTab === 'home' && (
        <>
          <section className="hero-section hospital-bg">
            <div className="hero-card glass">
              <span className="eyebrow">Real hospital style appointment system</span>
              <h1>Book hospital scans with a modern patient and admin workflow.</h1>
              <p>Search trusted hospitals, choose diagnostic services, submit patient details, and let the admin team confirm, reject or complete each appointment with full visibility.</p>
              <div className="hero-actions">
                <button className="primary-btn" onClick={() => setActiveTab('hospitals')}>Find Hospitals</button>
                <button className="secondary-btn" onClick={() => setChatOpen(true)}>Ask AI Scan Guide</button>
                <button className="outline-btn" onClick={() => openLogin('admin-login')}>Admin Login</button>
              </div>
              <div className="trust-row">
                <div><strong>24/7</strong><span>online access</span></div>
                <div><strong>Live</strong><span>slot requests</span></div>
                <div><strong>Admin</strong><span>approval workflow</span></div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="doctor-card">
                <span className="live-pill">● Hospital Desk Online</span>
                <div className="doctor-avatar">🩺</div>
                <h3>Digital Reception Dashboard</h3>
                <p>Patient booking details appear instantly in the admin page with date, time, phone, email, symptoms and status.</p>
                <div className="mini-grid">
                  <span>MRI</span><span>CT</span><span>X-Ray</span><span>USG</span>
                </div>
              </div>
            </div>
          </section>

          <section className="feature-section">
            <div className="section-title centered">
              <span className="eyebrow">Advanced hospital features</span>
              <h2>Built for patient convenience and admin control</h2>
            </div>
            <div className="feature-grid">
              <div className="feature-card"><span>🧾</span><h3>Detailed patient forms</h3><p>Capture age, gender, email, emergency contact, doctor name, symptoms and notes.</p></div>
              <div className="feature-card"><span>📅</span><h3>Appointment schedule</h3><p>Admin can view requested date, time, priority and current appointment status.</p></div>
              <div className="feature-card"><span>🏥</span><h3>Hospital availability</h3><p>Admin can mark hospitals available or unavailable so bookings open only for active hospital desks.</p></div>
              <div className="feature-card"><span>📊</span><h3>Reports dashboard</h3><p>View booking counts, scan demand, pending requests and confirmed revenue.</p></div>
              <div className="feature-card"><span>🤖</span><h3>AI scan guidance</h3><p>Patients can describe symptoms and get basic guidance on which scan may be relevant.</p></div>
              <div className="feature-card"><span>💳</span><h3>Cash, UPI & Razorpay demo</h3><p>Book with cash at hospital, UPI at hospital, or a simulated Razorpay payment flow.</p></div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'hospitals' && (
        <section className="content-section">
          <div className="section-title">
            <div>
              <span className="eyebrow">Hospital directory</span>
              <h2>Search diagnostic scan facilities</h2>
            </div>
            <button className="secondary-btn" onClick={loadPublicData}>Refresh</button>
          </div>

          <div className="filter-panel glass">
            <label>
              Scan Type
              <select value={filters.scan} onChange={(e) => setFilters({ ...filters, scan: e.target.value })}>
                <option value="">All scans</option>
                {scanTypes.map((scan) => <option key={scan.name} value={scan.name}>{scan.name} from {currency(scan.minPrice)}</option>)}
              </select>
            </label>
            <label>
              Area
              <input value={filters.area} onChange={(e) => setFilters({ ...filters, area: e.target.value })} placeholder="Whitefield, Jayanagar..." />
            </label>
            <label>
              Search hospital
              <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Hospital name, facility or address" />
            </label>
          </div>

          {visibleHospitals.length === 0 ? <EmptyState title="No hospitals found" text="Try a different scan type or area." /> : (
            <div className="hospital-grid">
              {visibleHospitals.map((hospital) => {
                const bookable = isHospitalBookable(hospital);
                return (
                <article className={`hospital-card ${bookable ? '' : 'hospital-unavailable'}`} key={hospital.id}>
                  <div className="hospital-image">
                    <span>🏥</span>
                    <b>{hospital.rating} ★</b>
                    <small>Accredited Diagnostic Unit</small>
                  </div>
                  <div className="hospital-body">
                    <div className="hospital-heading">
                      <div>
                        <h3>{hospital.name}</h3>
                        <p>{hospital.area}, {hospital.city}</p>
                      </div>
                      <span className={`availability-pill ${bookable ? 'open' : 'closed'}`}>{availabilityLabel(hospital)}</span>
                    </div>
                    {hospital.availabilityNote && <p className="availability-note">{hospital.availabilityNote}</p>}
                    <p className="description">{hospital.description}</p>
                    <div className="details-grid compact">
                      <Detail icon="📍" label="Address" value={hospital.address} />
                      <Detail icon="☎" label="Phone" value={hospital.phone} />
                      <Detail icon="⏱" label="Timings" value={hospital.openHours} />
                      <Detail icon="🚑" label="Emergency" value={hospital.emergencyPhone || 'Available on request'} />
                    </div>
                    <div className="facility-row">
                      {hospital.facilities?.slice(0, 5).map((item) => <span key={item}>{item}</span>)}
                    </div>
                    <div className="scan-list">
                      {hospital.scans.map((scan) => (
                        <button key={scan.id} className={`scan-chip ${bookable ? '' : 'disabled'}`} disabled={!bookable} onClick={() => startBooking(hospital, scan.id)}>
                          <b>{scan.name}</b>
                          <small>{bookable ? `${currency(scan.price)} · ${scan.duration}` : 'Booking disabled by admin'}</small>
                        </button>
                      ))}
                    </div>
                    <button className="primary-btn full" disabled={!bookable} onClick={() => startBooking(hospital)}>{bookable ? 'Book Appointment' : 'Currently Not Available'}</button>
                  </div>
                </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === 'my-bookings' && user?.role === 'user' && (
        <section className="content-section">
          <div className="section-title">
            <div>
              <span className="eyebrow">Patient dashboard</span>
              <h2>My scan appointment requests</h2>
            </div>
            <button className="secondary-btn" onClick={loadMyBookings}>Refresh</button>
          </div>
          {myBookings.length === 0 ? <EmptyState title="No bookings yet" text="Search hospitals and submit your first scan appointment request." /> : (
            <div className="booking-list">
              {myBookings.map((booking) => (
                <div className="booking-card patient-booking" key={booking.id}>
                  <div className="booking-main">
                    <StatusBadge status={booking.status} />
                    <h3>{booking.scan?.name}</h3>
                    <p>{booking.hospital?.name} · {booking.hospital?.area}</p>
                    <div className="details-grid compact">
                      <Detail icon="📅" label="Appointment" value={`${readableDate(booking.date)} at ${booking.time}`} />
                      <Detail icon="👤" label="Patient" value={`${booking.patientName} ${booking.patientAge ? `· ${booking.patientAge} yrs` : ''}`} />
                      <Detail icon="☎" label="Phone" value={booking.patientPhone} />
                      <Detail icon="🧑‍⚕️" label="Doctor" value={booking.doctorName || 'Not added'} />
                      <Detail icon="💳" label="Payment" value={booking.paymentStatus || 'Not selected'} />
                    </div>
                    {booking.symptoms && <p className="note-line"><b>Symptoms:</b> {booking.symptoms}</p>}
                  </div>
                  <div className="booking-actions">
                    {booking.status === 'Pending' && <button className="danger-btn" onClick={() => cancelBooking(booking.id)}>Cancel Request</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'admin' && isAdmin && (
        <section className="content-section admin-section">
          <div className="section-title">
            <div>
              <span className="eyebrow">Admin control centre</span>
              <h2>Manage patient appointments, hospitals and scans</h2>
            </div>
            <button className="secondary-btn" onClick={loadAdminData}>Refresh Admin Data</button>
          </div>

          <div className="stats-grid">
            {[
              ['Patients', adminStats?.users || 0], ['Hospitals', adminStats?.hospitals || 0], ['Available', adminStats?.availableHospitals || 0], ['Not Available', adminStats?.unavailableHospitals || 0],
              ['Total Appointments', adminStats?.bookings || 0], ['Pending', adminStats?.pending || 0], ['Confirmed', adminStats?.confirmed || 0], ['Revenue', currency(adminStats?.revenue || 0)],
              ['Unread Alerts', adminStats?.unreadNotifications || 0]
            ].map(([label, value]) => <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>

          <div className={`panel notification-panel ${notificationOpen ? 'open' : ''}`}>
            <div className="panel-head">
              <div>
                <span className="eyebrow">Admin notifications</span>
                <h3>{unreadNotificationCount} unread booking alert{unreadNotificationCount === 1 ? '' : 's'}</h3>
                <p>New patient appointments create an instant admin alert in this panel.</p>
              </div>
              <button className="secondary-btn" onClick={markNotificationsRead} disabled={notifications.length === 0}>Mark all read</button>
            </div>
            <div className="settings-row">
              <label><input type="checkbox" checked={!!notificationSettings.newBooking} onChange={(e) => saveNotificationSettings({ newBooking: e.target.checked })} /> New booking alerts</label>
              <label><input type="checkbox" checked={!!notificationSettings.browser} onChange={(e) => saveNotificationSettings({ browser: e.target.checked })} /> Browser popup</label>
              <label><input type="checkbox" checked={!!notificationSettings.sound} onChange={(e) => saveNotificationSettings({ sound: e.target.checked })} /> Sound alert</label>
              <label className="upi-setting">UPI ID <input value={notificationSettings.upiId || ''} onChange={(e) => setNotificationSettings({ ...notificationSettings, upiId: e.target.value })} onBlur={() => saveNotificationSettings({ upiId: notificationSettings.upiId })} /></label>
            </div>
            <div className="notification-list">
              {notifications.length === 0 ? <p>No notifications yet.</p> : notifications.slice(0, 6).map((item) => (
                <div className={`notification-item ${item.read ? 'read' : 'unread'}`} key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.message}</span>
                  <small>{readableDateTime(item.createdAt)}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="panel today-panel">
            <div>
              <span className="eyebrow">Today schedule</span>
              <h3>{todayBookings.length} active appointments for {readableDate(today)}</h3>
            </div>
            <div className="today-list">
              {todayBookings.length === 0 ? <p>No pending or confirmed appointments today.</p> : todayBookings.slice(0, 5).map((booking) => (
                <span key={booking.id}>{booking.time} · {booking.patientName} · {booking.scan?.name}</span>
              ))}
            </div>
          </div>

          <div className="admin-grid">
            <form className="admin-form panel" onSubmit={addHospital}>
              <h3>Add New Hospital</h3>
              <div className="two-col">
                <input required placeholder="Hospital name" value={hospitalForm.name} onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })} />
                <input required placeholder="Area" value={hospitalForm.area} onChange={(e) => setHospitalForm({ ...hospitalForm, area: e.target.value })} />
                <input required placeholder="Phone" value={hospitalForm.phone} onChange={(e) => setHospitalForm({ ...hospitalForm, phone: e.target.value })} />
                <input placeholder="Emergency phone" value={hospitalForm.emergencyPhone} onChange={(e) => setHospitalForm({ ...hospitalForm, emergencyPhone: e.target.value })} />
                <input placeholder="Email" value={hospitalForm.email} onChange={(e) => setHospitalForm({ ...hospitalForm, email: e.target.value })} />
                <input type="number" step="0.1" min="1" max="5" placeholder="Rating" value={hospitalForm.rating} onChange={(e) => setHospitalForm({ ...hospitalForm, rating: e.target.value })} />
              </div>
              <textarea required placeholder="Address" value={hospitalForm.address} onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })}></textarea>
              <textarea placeholder="Description" value={hospitalForm.description} onChange={(e) => setHospitalForm({ ...hospitalForm, description: e.target.value })}></textarea>
              <input placeholder="Facilities comma separated" value={hospitalForm.facilities} onChange={(e) => setHospitalForm({ ...hospitalForm, facilities: e.target.value })} />
              <div className="two-col">
                <label className="inline-admin-field">Booking availability
                  <select value={hospitalForm.bookingAvailable ? 'available' : 'unavailable'} onChange={(e) => setHospitalForm({ ...hospitalForm, bookingAvailable: e.target.value === 'available', availabilityNote: e.target.value === 'available' ? 'Available for appointment bookings' : 'Temporarily not accepting bookings' })}>
                    <option value="available">Available for Booking</option>
                    <option value="unavailable">Not Available for Booking</option>
                  </select>
                </label>
                <input placeholder="Availability note" value={hospitalForm.availabilityNote} onChange={(e) => setHospitalForm({ ...hospitalForm, availabilityNote: e.target.value })} />
              </div>
              <div className="two-col">
                <input required placeholder="First scan name" value={hospitalForm.scanName} onChange={(e) => setHospitalForm({ ...hospitalForm, scanName: e.target.value })} />
                <input required type="number" placeholder="Price" value={hospitalForm.scanPrice} onChange={(e) => setHospitalForm({ ...hospitalForm, scanPrice: e.target.value })} />
                <input placeholder="Duration" value={hospitalForm.scanDuration} onChange={(e) => setHospitalForm({ ...hospitalForm, scanDuration: e.target.value })} />
                <input placeholder="Preparation" value={hospitalForm.scanPreparation} onChange={(e) => setHospitalForm({ ...hospitalForm, scanPreparation: e.target.value })} />
              </div>
              <button className="primary-btn" disabled={loading}>Add Hospital</button>
            </form>

            <div className="panel">
              <h3>Reports & Analytics</h3>
              <div className="report-box">
                <h4>Hospital-wise bookings</h4>
                {Object.entries(report?.hospitalWise || {}).length === 0 ? <p>No booking report available.</p> : Object.entries(report.hospitalWise).map(([name, count]) => (
                  <div className="report-row" key={name}><span>{name}</span><b>{count}</b></div>
                ))}
              </div>
              <div className="report-box">
                <h4>Scan-wise demand</h4>
                {Object.entries(report?.scanWise || {}).length === 0 ? <p>No scan report available.</p> : Object.entries(report.scanWise).map(([name, count]) => (
                  <div className="report-row" key={name}><span>{name}</span><b>{count}</b></div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel appointment-panel">
            <div className="panel-head">
              <div>
                <h3>Patient Appointment Requests</h3>
                <p>Every patient login booking is shown here with date, time and full patient details.</p>
              </div>
              <div className="admin-filters">
                <select value={adminStatusFilter} onChange={(e) => setAdminStatusFilter(e.target.value)}>
                  {['All', 'Pending', 'Confirmed', 'Rejected', 'Completed', 'Cancelled'].map((item) => <option key={item}>{item}</option>)}
                </select>
                <input value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} placeholder="Search patient, phone, scan, date..." />
              </div>
            </div>

            {filteredAdminBookings.length === 0 ? <EmptyState title="No appointment requests" text="Patient bookings will appear here after submission." /> : (
              <div className="appointment-grid">
                {filteredAdminBookings.map((booking) => (
                  <article className="appointment-card" key={booking.id}>
                    <div className="appointment-top">
                      <div>
                        <small>Appointment ID</small>
                        <strong>{booking.id}</strong>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>
                    <div className="patient-strip">
                      <div className="avatar-mini">{booking.patientName?.slice(0, 1) || 'P'}</div>
                      <div>
                        <h3>{booking.patientName}</h3>
                        <p>{booking.patientAge ? `${booking.patientAge} yrs` : 'Age not added'} · {booking.gender || 'Gender not added'} · {booking.priority || 'Normal'} Priority</p>
                      </div>
                    </div>
                    <div className="details-grid">
                      <Detail icon="📅" label="Date" value={readableDate(booking.date)} />
                      <Detail icon="⏰" label="Time" value={booking.time} />
                      <Detail icon="☎" label="Phone" value={booking.patientPhone} />
                      <Detail icon="✉" label="Email" value={booking.patientEmail || booking.user?.email} />
                      <Detail icon="🏥" label="Hospital" value={booking.hospital?.name} />
                      <Detail icon="🔬" label="Scan" value={`${booking.scan?.name || '-'} · ${currency(booking.scan?.price)}`} />
                      <Detail icon="🧑‍⚕️" label="Doctor" value={booking.doctorName || 'Not added'} />
                      <Detail icon="💳" label="Payment" value={booking.paymentStatus || 'Not selected'} />
                      <Detail icon="🚨" label="Emergency Contact" value={booking.emergencyContact || 'Not added'} />
                    </div>
                    <div className="medical-notes">
                      <p><b>Symptoms / Reason:</b> {booking.symptoms || 'Not mentioned'}</p>
                      <p><b>Additional Notes:</b> {booking.notes || 'Not mentioned'}</p>
                      <p><b>Requested On:</b> {readableDateTime(booking.createdAt)}</p>
                    </div>
                    <div className="action-cell appointment-actions">
                      <button onClick={() => updateBookingStatus(booking.id, 'Confirmed')}>Confirm</button>
                      <button onClick={() => updateBookingStatus(booking.id, 'Rejected')}>Reject</button>
                      <button onClick={() => updateBookingStatus(booking.id, 'Completed')}>Complete</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h3>Manage Scan Services</h3>
            <div className="manage-grid">
              {hospitals.map((hospital) => {
                const bookable = isHospitalBookable(hospital);
                return (
                <div className={`manage-card ${bookable ? '' : 'hospital-unavailable'}`} key={hospital.id}>
                  <div className="manage-head">
                    <div>
                      <h4>{hospital.name}</h4>
                      <small>{hospital.area}</small>
                      <span className={`availability-pill ${bookable ? 'open' : 'closed'}`}>{availabilityLabel(hospital)}</span>
                    </div>
                    <div className="manage-actions">
                      <button className={bookable ? 'outline-btn' : 'secondary-btn'} onClick={() => updateHospitalAvailability(hospital, !bookable)}>{bookable ? 'Mark Unavailable' : 'Mark Available'}</button>
                      <button className="danger-btn" onClick={() => deleteHospital(hospital.id)}>Remove</button>
                    </div>
                  </div>
                  <div className="availability-admin">
                    <label>Availability note</label>
                    <input value={hospital.availabilityNote || ''} onChange={(e) => editAvailabilityNote(hospital.id, e.target.value)} onBlur={() => saveAvailabilityNote(hospital)} placeholder="Example: MRI room under maintenance today" />
                  </div>
                  <div className="mini-scans">
                    {hospital.scans.map((scan) => <span key={scan.id}>{scan.name} - {currency(scan.price)} <button onClick={() => deleteScan(hospital.id, scan.id)}>×</button></span>)}
                  </div>
                  <div className="add-scan-row">
                    <input placeholder="Scan name" value={newScan[hospital.id]?.name || ''} onChange={(e) => setNewScan((prev) => ({ ...prev, [hospital.id]: { ...(prev[hospital.id] || {}), name: e.target.value } }))} />
                    <input type="number" placeholder="Price" value={newScan[hospital.id]?.price || ''} onChange={(e) => setNewScan((prev) => ({ ...prev, [hospital.id]: { ...(prev[hospital.id] || {}), price: e.target.value } }))} />
                    <button onClick={() => addScan(hospital.id)}>Add</button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {authOpen && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target.className === 'modal-backdrop' && setAuthOpen(false)}>
          <form className={`modal-card auth-card ${authMode === 'admin-login' ? 'admin-login-card' : ''}`} onSubmit={handleAuthSubmit}>
            <button type="button" className="close-btn" onClick={() => setAuthOpen(false)}>×</button>
            <span className="eyebrow">{authSubtitle}</span>
            <h2>{authTitle}</h2>
            {authMode === 'register' && (
              <>
                <label>Full Name<input required value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} /></label>
                <label>Phone<input required value={authForm.phone} onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })} /></label>
              </>
            )}
            <label>Email<input required type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} /></label>
            <label>Password<input required type="password" minLength="6" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} /></label>
            <button className="primary-btn full" disabled={loading}>{loading ? 'Please wait...' : authMode === 'register' ? 'Create Patient Account' : 'Login Securely'}</button>
            <div className="login-switch-row">
              {authMode !== 'patient-login' && <button type="button" onClick={() => openLogin('patient-login')}>Patient Login</button>}
              {authMode !== 'admin-login' && <button type="button" onClick={() => openLogin('admin-login')}>Admin Login</button>}
              {authMode !== 'register' && <button type="button" onClick={() => { setAuthMode('register'); setAuthForm({ name: '', email: '', phone: '', password: '' }); }}>New Patient Registration</button>}
            </div>
            <div className="demo-logins">
              <b>Demo Credentials</b>
              <span>Admin: admin@ecoscan.com / admin123</span>
              <span>Patient: patient@ecoscan.com / patient123</span>
            </div>
          </form>
        </div>
      )}

      {bookingHospital && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target.className === 'modal-backdrop' && setBookingHospital(null)}>
          <form className="modal-card booking-modal" onSubmit={submitBooking}>
            <button type="button" className="close-btn" onClick={() => setBookingHospital(null)}>×</button>
            <span className="eyebrow">Patient appointment request</span>
            <h2>{bookingHospital.name}</h2>
            <div className={`booking-availability-box ${selectedHospitalBookable ? 'open' : 'closed'}`}>
              <strong>{availabilityLabel(bookingHospital)}</strong>
              <span>{bookingHospital.availabilityNote || (selectedHospitalBookable ? 'You can continue with this appointment request.' : 'Please choose another hospital.')}</span>
            </div>
            <label>Scan Type
              <select required value={bookingForm.scanId} onChange={(e) => setBookingForm({ ...bookingForm, scanId: e.target.value })}>
                {bookingHospital.scans.map((scan) => <option key={scan.id} value={scan.id}>{scan.name} - {currency(scan.price)} - {scan.duration}</option>)}
              </select>
            </label>
            <div className="two-col">
              <label>Date<input required type="date" min={today} value={bookingForm.date} onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })} /></label>
              <label>Time<input required type="time" value={bookingForm.time} onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })} /></label>
            </div>
            <div className="payment-box">
              <div>
                <span className="eyebrow">Payment option</span>
                <h3>{selectedBookingScan?.name || 'Selected scan'} · {currency(selectedBookingScan?.price || 0)}</h3>
              </div>
              <div className="payment-options">
                <label className={bookingForm.paymentMode === 'cash' ? 'selected' : ''}><input type="radio" name="paymentMode" checked={bookingForm.paymentMode === 'cash'} onChange={() => setBookingForm({ ...bookingForm, paymentMode: 'cash' })} /> Cash at Hospital</label>
                <label className={bookingForm.paymentMode === 'upi' ? 'selected' : ''}><input type="radio" name="paymentMode" checked={bookingForm.paymentMode === 'upi'} onChange={() => setBookingForm({ ...bookingForm, paymentMode: 'upi' })} /> UPI at Hospital</label>
                <label className={bookingForm.paymentMode === 'razorpay_demo' ? 'selected' : ''}><input type="radio" name="paymentMode" checked={bookingForm.paymentMode === 'razorpay_demo'} onChange={() => setBookingForm({ ...bookingForm, paymentMode: 'razorpay_demo' })} /> Demo Razorpay</label>
              </div>
              {bookingForm.paymentMode === 'upi' && <p className="payment-note">Demo UPI ID: {publicConfig.upiId || 'ecoscan@upi'}. Payment can be collected at hospital counter.</p>}
              {bookingForm.paymentMode === 'razorpay_demo' && <p className="payment-note">A demo Razorpay checkout confirmation will appear. No real money is charged.</p>}
            </div>
            <div className="two-col">
              <label>Patient Name<input required value={bookingForm.patientName} onChange={(e) => setBookingForm({ ...bookingForm, patientName: e.target.value })} /></label>
              <label>Patient Phone<input required value={bookingForm.patientPhone} onChange={(e) => setBookingForm({ ...bookingForm, patientPhone: e.target.value })} /></label>
              <label>Email<input type="email" value={bookingForm.patientEmail} onChange={(e) => setBookingForm({ ...bookingForm, patientEmail: e.target.value })} /></label>
              <label>Age<input type="number" min="1" max="120" value={bookingForm.patientAge} onChange={(e) => setBookingForm({ ...bookingForm, patientAge: e.target.value })} /></label>
              <label>Gender<select value={bookingForm.gender} onChange={(e) => setBookingForm({ ...bookingForm, gender: e.target.value })}>
                <option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option>
              </select></label>
              <label>Emergency Contact<input value={bookingForm.emergencyContact} onChange={(e) => setBookingForm({ ...bookingForm, emergencyContact: e.target.value })} /></label>
              <label>Doctor / Reference<input value={bookingForm.doctorName} onChange={(e) => setBookingForm({ ...bookingForm, doctorName: e.target.value })} placeholder="Doctor name if any" /></label>
              <label>Priority<select value={bookingForm.priority} onChange={(e) => setBookingForm({ ...bookingForm, priority: e.target.value })}>
                <option>Normal</option><option>Urgent</option><option>Emergency</option>
              </select></label>
            </div>
            <label>Symptoms / Reason<textarea value={bookingForm.symptoms} onChange={(e) => setBookingForm({ ...bookingForm, symptoms: e.target.value })} placeholder="Example: Headache, abdominal pain, follow-up scan..."></textarea></label>
            <label>Additional Notes<textarea value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })} placeholder="Preferred timing, doctor reference, special needs..."></textarea></label>
            <button className="primary-btn full" disabled={loading || !selectedHospitalBookable}>{loading ? 'Submitting...' : selectedHospitalBookable ? 'Submit Appointment Request' : 'Hospital Not Available for Booking'}</button>
          </form>
        </div>
      )}

      <button className="chat-fab" onClick={() => setChatOpen(true)}>🤖 AI Scan Guide</button>

      {chatOpen && (
        <div className="chat-drawer">
          <div className="chat-header">
            <div>
              <span className="eyebrow">AI ChatBox</span>
              <h3>Scan guidance assistant</h3>
            </div>
            <button onClick={() => setChatOpen(false)}>×</button>
          </div>
          <div className="chat-warning">For guidance only. Final scan decision must be made by a qualified doctor.</div>
          <div className="chat-body">
            {chatMessages.map((msg, index) => (
              <div className={`chat-message ${msg.role}`} key={`${msg.role}-${index}`}>
                <p>{msg.text}</p>
                {msg.advice && (
                  <div className="advice-card">
                    {msg.advice.recommendations.map((item) => (
                      <div className="advice-item" key={item.scan}>
                        <div>
                          <strong>{item.scan}</strong>
                          <span>{item.reason}</span>
                          <small><b>Urgency:</b> {item.urgency}</small>
                          <small><b>Preparation:</b> {item.preparation}</small>
                        </div>
                        {item.scan !== 'Doctor Consultation First' && <button onClick={() => applyScanFromAssistant(item.scan)}>Find Hospitals</button>}
                      </div>
                    ))}
                    <ul>
                      {msg.advice.nextSteps.map((step) => <li key={step}>{step}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            {chatLoading && <div className="chat-message assistant"><p>Checking symptoms and scan guidance...</p></div>}
          </div>
          <form className="chat-input" onSubmit={askScanAssistant}>
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Example: severe headache after fall, stomach pain, fracture..." />
            <button disabled={chatLoading}>{chatLoading ? '...' : 'Ask'}</button>
          </form>
        </div>
      )}

      <footer className="footer">
        <strong>Eco Scan Hospitals</strong>
        <span>AI Scan Guide · Admin Notifications · Cash/UPI/Demo Razorpay · Patient Login · Admin Dashboard</span>
      </footer>
    </main>
  );
}
