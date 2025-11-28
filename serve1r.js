// --- Rudrakalshethra Backend ---
// Full working backend for Bharatanatyam Mudra theory app with Student Authentication

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folders
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// ---------- MongoDB Connection ----------
const mongoURI =
  process.env.MONGO_URI ||
  'mongodb+srv://ajithtest95:ajith%40123@cluster0.n3qvh.mongodb.net/rudrakalshethra?retryWrites=true&w=majority';

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// ---------- Multer Setup for Image Upload ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const fileName = Date.now() + '-' + file.originalname;
    cb(null, fileName);
  },
});

const upload = multer({ storage });

// ---------- Mongoose Schemas ----------

// User Schema for Student Authentication
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// Mudra Schema (existing)
const mudraSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true, enum: ['Asamyukta Hasta', 'Samyukta Hasta'] },
  meaning: { type: String },
  description: { type: String },
  image: { type: String },
  theory: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Mudra = mongoose.model('Mudra', mudraSchema);

// Theory Schema for detailed content
const theorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Theory = mongoose.model('Theory', theorySchema);

// ---------- Authentication Middleware ----------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ---------- Routes ----------

// 🌺 Authentication Routes

// Student Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'student' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('❌ Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Student Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('❌ Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// 🌺 Mudra Routes (existing, with optional authentication)

// Add New Mudra Theory
app.post('/api/mudras', async (req, res) => {
  try {
    const { name, category, meaning, description, image, theory } = req.body;

    const mudra = new Mudra({ 
      name, 
      category, 
      meaning,
      description, 
      image,
      theory
    });

    await mudra.save();
    res.status(201).json({ message: 'Mudra theory added successfully', mudra });
  } catch (error) {
    console.error('❌ Error adding mudra:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to add mudra theory' });
  }
});

// Get All Mudras
app.get('/api/mudras', async (req, res) => {
  try {
    const mudras = await Mudra.find().sort({ createdAt: -1 });
    res.json(mudras);
  } catch (error) {
    console.error('❌ Error fetching mudras:', error);
    res.status(500).json({ error: 'Failed to fetch mudras' });
  }
});

// Get Mudra by ID
app.get('/api/mudras/:id', async (req, res) => {
  try {
    const mudra = await Mudra.findById(req.params.id);
    if (!mudra) return res.status(404).json({ error: 'Mudra not found' });
    res.json(mudra);
  } catch (error) {
    console.error('❌ Error fetching mudra:', error);
    res.status(500).json({ error: 'Failed to fetch mudra' });
  }
});

// Update Mudra
app.put('/api/mudras/:id', async (req, res) => {
  try {
    const updatedMudra = await Mudra.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedMudra)
      return res.status(404).json({ error: 'Mudra not found' });
    res.json({ message: 'Mudra updated successfully', mudra: updatedMudra });
  } catch (error) {
    console.error('❌ Error updating mudra:', error);
    res.status(500).json({ error: 'Failed to update mudra' });
  }
});

// Delete Mudra
app.delete('/api/mudras/:id', async (req, res) => {
  try {
    const result = await Mudra.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Mudra not found' });
    res.json({ message: 'Mudra deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting mudra:', error);
    res.status(500).json({ error: 'Failed to delete mudra' });
  }
});

// Filter by Mudra Category
app.get('/api/mudras/category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const mudras = await Mudra.find({ category });
    res.json(mudras);
  } catch (error) {
    console.error('❌ Error fetching by category:', error);
    res.status(500).json({ error: 'Failed to fetch mudras by category' });
  }
});

// 🌺 Theory Routes

// Get all theory topics
app.get('/api/theory', async (req, res) => {
  try {
    const theories = await Theory.find().sort({ createdAt: -1 });
    res.json(theories);
  } catch (error) {
    console.error('❌ Error fetching theories:', error);
    res.status(500).json({ error: 'Failed to fetch theories' });
  }
});

// Get theory by title
app.get('/api/theory/:title', async (req, res) => {
  try {
    const title = decodeURIComponent(req.params.title);
    const theory = await Theory.findOne({ title });
    if (!theory) return res.status(404).json({ error: 'Theory not found' });
    res.json(theory);
  } catch (error) {
    console.error('❌ Error fetching theory:', error);
    res.status(500).json({ error: 'Failed to fetch theory' });
  }
});

// Add new theory (protected)
app.post('/api/theory', authenticateToken, async (req, res) => {
  try {
    const { title, content, category } = req.body;

    const theory = new Theory({
      title,
      content,
      category
    });

    await theory.save();
    res.status(201).json({ message: 'Theory added successfully', theory });
  } catch (error) {
    console.error('❌ Error adding theory:', error);
    res.status(500).json({ error: 'Failed to add theory' });
  }
});

// 🌺 User Profile Route (protected)
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// 🌿 Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Rudrakalshethra Mudra Theory API running fine',
    timestamp: new Date().toISOString(),
  });
});

// 🌸 Root Route
app.get('/', (req, res) => {
  res.send(`
    <h2>🎭 Rudrakalshethra Mudra Theory Server Running 🎭</h2>
    <p>Server running on Port ${PORT}. Check <a href="/api/mudras">/api/mudras</a> for data.</p>
    <p>Authentication endpoints available at /api/auth/register and /api/auth/login</p>
  `);
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`🚀 Rudrakalshethra Server Running on Port ${PORT}`);
  console.log(`🔐 Authentication system enabled`);
});