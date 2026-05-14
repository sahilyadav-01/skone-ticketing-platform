CREATE DATABASE IF NOT EXISTS skone_ticketing DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE skone_ticketing;

CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Client', 'Support Engineer', 'Admin') NOT NULL DEFAULT 'Client',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  asset_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  client_id INT NOT NULL,
  deployment_date DATE,
  last_maintenance_date DATE,
  status ENUM('Active', 'In Repair', 'Decommissioned') NOT NULL DEFAULT 'Active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tickets (
  ticket_id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  asset_id INT DEFAULT NULL,
  issue_type VARCHAR(150) NOT NULL,
  error_code VARCHAR(50) DEFAULT NULL,
  status ENUM('Open', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Open',
  assigned_tech VARCHAR(150) DEFAULT NULL,
  description TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE SET NULL
);
