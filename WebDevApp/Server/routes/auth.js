// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/config');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

const isAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.session.userId]
    );
    const user = result.rows[0];
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ---------- Signup ----------
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, is_admin, created_at)
       VALUES ($1, $2, $3, false, NOW())
       RETURNING id, name, email, is_admin`,
      [name, email, hashedPassword]
    );

    const newUser = result.rows[0];

    req.session.userId = newUser.id;
    req.session.user = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      is_admin: newUser.is_admin,
    };

    res.status(201).json({
      message: 'User created and logged in',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        is_admin: newUser.is_admin,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ---------- Login ----------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash, is_admin FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: user.is_admin,
    };

    res.json({
      message: 'Logged in',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_admin: user.is_admin,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ---------- Logout ----------
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

// ---------- Get current user ----------
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, is_admin, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    const user = result.rows[0];
    if (!user) {
      req.session.destroy();
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ---------- Admin: Get all users ----------
router.get('/admin/users', isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, is_admin, created_at FROM users ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Admin users list error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ---------- Admin: Search and promote/demote (FIXED) ----------
router.put('/admin/users', isAdmin, async (req, res) => {
  const { search, is_admin } = req.body;

  if (!search) {
    return res.status(400).json({ error: 'Search value is required' });
  }
  if (typeof is_admin !== 'boolean') {
    return res.status(400).json({ error: 'is_admin must be a boolean' });
  }

  try {
    // 🔧 Convert search to string for safe trimming
    const searchStr = String(search);
    const isNumeric = !isNaN(search) && searchStr.trim() !== '';

    let query = '';
    let params = [];
    if (isNumeric) {
      query = 'SELECT id, name, email, is_admin FROM users WHERE id = $1';
      params = [parseInt(search)];
    } else {
      query = `SELECT id, name, email, is_admin FROM users 
               WHERE LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($1)`;
      params = [searchStr.trim()];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No user found matching the search' });
    }
    if (result.rows.length > 1) {
      return res.status(400).json({
        error: 'Multiple users found. Please use a more specific search (e.g., id or full email).',
        users: result.rows.map(u => ({ id: u.id, name: u.name, email: u.email })),
      });
    }

    const user = result.rows[0];

    if (user.id === req.session.userId && is_admin === false) {
      return res.status(400).json({ error: 'You cannot demote yourself' });
    }

    await pool.query(
      'UPDATE users SET is_admin = $1 WHERE id = $2',
      [is_admin, user.id]
    );

    res.json({
      message: `User ${is_admin ? 'promoted to' : 'demoted from'} admin`,
      user: { id: user.id, name: user.name, email: user.email, is_admin },
    });
  } catch (err) {
    console.error('❌ Admin update error:', err);
    res.status(500).json({
      error: 'Failed to update user',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ---------- Admin: Promote by ID (legacy) ----------
router.post('/admin/promote/:id', isAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const check = await pool.query(
      'SELECT id, is_admin FROM users WHERE id = $1',
      [userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (check.rows[0].is_admin) {
      return res.status(400).json({ error: 'User is already admin' });
    }

    await pool.query(
      'UPDATE users SET is_admin = true WHERE id = $1',
      [userId]
    );

    res.json({
      message: 'User promoted to admin',
      user: { id: userId, is_admin: true },
    });
  } catch (err) {
    console.error('Promote error:', err);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

module.exports = router;