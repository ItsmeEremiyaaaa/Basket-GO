const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Create connection to InfinityFree MySQL database
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

db.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
    return;
  }
  console.log('Connected to InfinityFree MySQL database!');
});

// Test Connection Endpoint
app.get('/api/test', (req, res) => {
  db.query('SELECT 1 + 1 AS solution', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Authentication Endpoint (Connects React Login to MySQL)
app.post('/api/login', (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, message: 'Username/Email is required' });
  }

  // Check if user exists in the users table by name or phone
  const query = 'SELECT * FROM users WHERE name = ? OR phone = ? LIMIT 1';

  db.query(query, [username, username], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (results.length > 0) {
      const user = results[0];
      return res.json({
        success: true,
        user: {
          user_id: user.user_id,
          name: user.name,
          phone: user.phone,
          address: user.address,
          status: user.status,
          is_admin: user.status === 'admin' ? 1 : 0
        }
      });
    } else {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
  });
});

// Start express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});