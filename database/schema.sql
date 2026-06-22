-- Database Schema for SmartTrack

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'driver', 'customer')),
  phone VARCHAR(20),
  company VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipments Table
CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  tracking_number VARCHAR(100) UNIQUE NOT NULL,
  origin_location VARCHAR(255) NOT NULL,
  destination_location VARCHAR(255) NOT NULL,
  sender_id INT REFERENCES users(id),
  driver_id INT REFERENCES users(id),
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_transit', 'delivered', 'failed')),
  weight DECIMAL(10, 2),
  dimensions VARCHAR(100),
  contents TEXT,
  sender_name VARCHAR(255),
  recipient_name VARCHAR(255),
  sender_phone VARCHAR(20),
  recipient_phone VARCHAR(20),
  origin_latitude DECIMAL(10, 8),
  origin_longitude DECIMAL(11, 8),
  destination_latitude DECIMAL(10, 8),
  destination_longitude DECIMAL(11, 8),
  planned_route JSONB,
  expected_delivery TIMESTAMP,
  actual_delivery TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GPS Locations Table
CREATE TABLE IF NOT EXISTS gps_locations (
  id SERIAL PRIMARY KEY,
  shipment_id INT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  altitude DECIMAL(10, 2),
  accuracy DECIMAL(10, 2),
  speed DECIMAL(10, 2),
  recorded_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sensor Data Table (Temperature & Humidity)
CREATE TABLE IF NOT EXISTS sensor_data (
  id SERIAL PRIMARY KEY,
  shipment_id INT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  temperature DECIMAL(6, 2),
  humidity DECIMAL(5, 2),
  pressure DECIMAL(10, 2),
  sensor_id VARCHAR(100),
  recorded_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RFID Scans Table
CREATE TABLE IF NOT EXISTS rfid_scans (
  id SERIAL PRIMARY KEY,
  shipment_id INT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  rfid_tag_id VARCHAR(100) NOT NULL,
  checkpoint_name VARCHAR(255),
  checkpoint_location VARCHAR(255),
  scan_time TIMESTAMP NOT NULL,
  scanned_by_id INT REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  shipment_id INT REFERENCES shipments(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  threshold_value DECIMAL(10, 2),
  current_value DECIMAL(10, 2),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_id INT REFERENCES alerts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  notification_type VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Routes Table
CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  waypoints TEXT,
  estimated_duration INT,
  distance DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INT,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_driver ON shipments(driver_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_gps_shipment ON gps_locations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_gps_shipment_time ON gps_locations(shipment_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_sensor_shipment ON sensor_data(shipment_id);
CREATE INDEX IF NOT EXISTS idx_sensor_shipment_time ON sensor_data(shipment_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_rfid_shipment_tag ON rfid_scans(shipment_id, rfid_tag_id);
CREATE INDEX IF NOT EXISTS idx_alerts_shipment_resolved ON alerts(shipment_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
