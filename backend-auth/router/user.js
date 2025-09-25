const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


router.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// Handle signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    const termsAccepted = req.body.termsAccepted === 'true'; // checkbox fix

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.render('signup', { error: 'Email already exists' });

    // Password match check
    if (password !== confirmPassword) return res.render('signup', { error: 'Passwords do not match' });

    // Terms check
    if (!termsAccepted) return res.render('signup', { error: 'You must accept the terms & conditions' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    console.log('User created:', user.email); // debug log

    res.redirect('/login'); // redirect after signup

  } catch (error) {
    console.error('Signup error:', error);
    res.render('signup', { error: 'An error occurred during registration' });
  }
});


// Render login page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Handle login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'mysecret',
      { expiresIn: '1h' }
    );

    res.cookie('token', token, { httpOnly: true });
    res.redirect('/index');  // Redirect to index after login
  } catch (error) {
    res.render('login', { error: 'An error occurred during login' });
  }
});


// Index (protected, now serves the recommendation page)
router.get("/index", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.redirect('/login');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecret');
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.redirect('/login');
    }

    res.render("index", { user });
  } catch (error) {
    res.redirect('/login');
  }
});

// Dashboard (protected) - Optional, can merge with index if not needed separately
router.get("/profile", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecret');
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return res.redirect('/login');
    res.render("profile", { user });
  } catch (error) {
    res.redirect('/login');
  }
});

// logout route
router.get("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,   // make sure cookie isn’t accessible via JS
    secure: true,     // use true if you’re on HTTPS
    sameSite: "strict"
  });
  res.redirect("/login");
});

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add favorite movie
router.post('/:id/favorites', async (req, res) => {
  try {
    const { movieId, tmdbId, title, genres } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.favoriteMovies.push({ movieId, tmdbId, title, genres });
    await user.save();
    res.json({ message: 'Movie added to favorites' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's favorite movies
router.get('/:id/favorites', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.favoriteMovies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add favorite book (new endpoint; assume User model has favoriteBooks: [])
router.post('/:id/favorite-books', async (req, res) => {
  try {
    const { isbn, title, authors } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.favoriteBooks.push({ isbn, title, authors });
    await user.save();
    res.json({ message: 'Book added to favorites' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's favorite books (new endpoint)
router.get('/:id/favorite-books', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.favoriteBooks || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;