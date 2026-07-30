CREATE DATABASE IF NOT EXISTS gen_erp_db;
USE gen_erp_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  employee_id VARCHAR(50),
  designation VARCHAR(100),
  department VARCHAR(100),
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_rights (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  right_name VARCHAR(100) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Default Admin User (Password is 'admin123')
INSERT INTO users (name, email, password_hash, employee_id, designation, department, phone_number)
VALUES ('Admin User', 'admin@gen-erp.com', '$2b$10$0z5gQ9K53/26R//U9Q7dce7e9HqT4.T1uS2S1W9/Ff40H/S6s2Fqy', 'EMP-001', 'System Administrator', 'IT', '1234567890');
