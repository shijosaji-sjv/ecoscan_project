-- Eco Scan MySQL Schema
-- This schema matches the project report database design and can be used if you want to migrate from JSON file storage to MySQL.

CREATE DATABASE IF NOT EXISTS ecoscan_db;
USE ecoscan_db;

CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hospitals (
  hospital_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  area VARCHAR(100) NOT NULL,
  city VARCHAR(100) DEFAULT 'Bangalore',
  address TEXT NOT NULL,
  phone VARCHAR(30) NOT NULL,
  emergency_phone VARCHAR(30),
  email VARCHAR(120),
  rating DECIMAL(2,1) DEFAULT 4.5,
  open_hours VARCHAR(180),
  description TEXT,
  facilities TEXT,
  booking_available BOOLEAN DEFAULT TRUE,
  availability_note VARCHAR(255) DEFAULT 'Available for appointment bookings',
  availability_updated_at TIMESTAMP NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scan_types (
  scan_id INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id INT NOT NULL,
  scan_name VARCHAR(120) NOT NULL,
  scan_price INT NOT NULL,
  duration VARCHAR(50),
  preparation TEXT,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE
);

CREATE TABLE appointments (
  appoint_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  hospital_id INT NOT NULL,
  scan_id INT NOT NULL,
  patient_name VARCHAR(120) NOT NULL,
  patient_phone VARCHAR(20) NOT NULL,
  patient_email VARCHAR(120),
  patient_age VARCHAR(10),
  gender VARCHAR(30),
  emergency_contact VARCHAR(20),
  doctor_name VARCHAR(120),
  department VARCHAR(80) DEFAULT 'Radiology',
  priority ENUM('Normal', 'Urgent', 'Emergency') DEFAULT 'Normal',
  symptoms TEXT,
  notes TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status ENUM('Pending', 'Confirmed', 'Rejected', 'Completed', 'Cancelled') DEFAULT 'Pending',
  payment_status VARCHAR(50) DEFAULT 'Pay at Hospital',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id),
  FOREIGN KEY (scan_id) REFERENCES scan_types(scan_id)
);

-- Added for enhanced version: payment details and admin notifications
ALTER TABLE appointments
  ADD COLUMN payment_mode ENUM('cash', 'upi', 'razorpay_demo') DEFAULT 'cash',
  ADD COLUMN payment_reference VARCHAR(120),
  ADD COLUMN payment_order_id VARCHAR(120),
  ADD COLUMN payment_provider VARCHAR(80);

CREATE TABLE admin_notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  notification_type VARCHAR(60) DEFAULT 'info',
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  booking_id INT NULL,
  priority VARCHAR(30) DEFAULT 'Normal',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_notification_settings (
  setting_id INT AUTO_INCREMENT PRIMARY KEY,
  new_booking BOOLEAN DEFAULT TRUE,
  browser_popup BOOLEAN DEFAULT TRUE,
  sound_alert BOOLEAN DEFAULT FALSE,
  email_alert BOOLEAN DEFAULT FALSE,
  upi_id VARCHAR(120) DEFAULT 'ecoscan@upi',
  razorpay_demo BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
