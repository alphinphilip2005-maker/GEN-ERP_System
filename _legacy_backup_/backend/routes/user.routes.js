const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

// GET all users
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, employee_id, designation, department, phone_number, created_at FROM users');
    
    // Also fetch their rights to enrich the data
    const [rights] = await pool.query('SELECT user_id, right_name FROM user_rights');
    
    const formattedUsers = users.map(user => {
      const userRights = rights.filter(r => r.user_id === user.id).map(r => r.right_name);
      return { ...user, rights: userRights };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// POST to create a new user
router.post('/', async (req, res) => {
  const { name, email, password, employee_id, designation, department, phone_number, rights } = req.body;

  if (!name || !email || !password || !employee_id) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const [userResult] = await connection.query(
      'INSERT INTO users (name, email, password_hash, employee_id, designation, department, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, employee_id, designation, department, phone_number]
    );

    const userId = userResult.insertId;

    if (rights && Array.isArray(rights) && rights.length > 0) {
      const rightValues = rights.map(r => [userId, r]);
      await connection.query('INSERT INTO user_rights (user_id, right_name) VALUES ?', [rightValues]);
    }

    await connection.commit();
    res.status(201).json({ message: 'User created successfully', id: userId });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Error creating user' });
  } finally {
    connection.release();
  }
});

module.exports = router;
