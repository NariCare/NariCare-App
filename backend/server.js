```javascript
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test DB connection
pool.getConnection()
  .then(connection => {
    console.log('Connected to MySQL database!');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to database:', err.message);
    process.exit(1); // Exit if DB connection fails
  });

// Register Route
app.post('/api/register', async (req, res) => {
  const { email, password, firstName, lastName, phoneNumber, motherType, dueDate, whatsappNumber } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ message: 'Please provide email, password, first name, and last name.' });
  }

  try {
    // Check if user already exists
    const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Insert new user
    const [result] = await pool.execute(
      'INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, mother_type, due_date, whatsapp_number, is_onboarding_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, email, hashedPassword, firstName, lastName, phoneNumber, motherType, dueDate, whatsappNumber, false]
    );

    // Automatically create a basic tier for the new user
    await pool.execute(
      'INSERT INTO user_tiers (id, user_id, tier_type, start_date, consultations_remaining, is_active) VALUES (?, ?, ?, CURDATE(), ?, ?)',
      [uuidv4(), userId, 'basic', 0, true]
    );

    res.status(201).json({ message: 'User registered successfully!', userId });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password.' });
  }

  try {
    // Find user by email
    const [users] = await pool.execute('SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = ?', [email]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(\`Server running on port ${PORT}`);
});
```