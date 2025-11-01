// --- Rudrakalshethra Backend Server ---
// Complete working Express + MongoDB Atlas backend

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded and static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

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
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ---------- Multer Setup for File Upload ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ---------- Mongoose Schemas ----------

// Mudra Schema
const mudraSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Asamyukta', 'Samyukta'], required: true },
  meaning: String,
  description: String,
  image: String, // file path or URL
});

// User Schema (for student login/signup)
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'student' },
});

const Mudra = mongoose.model('Mudra', mudraSchema);
const User = mongoose.model('User', userSchema);

// ---------- Routes ----------

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Rudrakalshethra API is running',
    timestamp: new Date().toISOString(),
  });
});

// Upload Mudra image
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    message: 'File uploaded successfully',
    filePath: `/uploads/${req.file.filename}`,
  });
});

// Add new Mudra
app.post('/api/mudras', async (req, res) => {
  try {
    const mudra = new Mudra(req.body);
    await mudra.save();
    res.status(201).json({ message: 'Mudra added successfully', mudra });
  } catch (error) {
    console.error('Error adding mudra:', error);
    res.status(500).json({ error: 'Failed to save mudra' });
  }
});

// Get all Mudras
app.get('/api/mudras', async (req, res) => {
  try {
    const mudras = await Mudra.find();
    res.json(mudras);
  } catch (error) {
    console.error('Error fetching mudras:', error);
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
    console.error('Error fetching mudra:', error);
    res.status(500).json({ error: 'Failed to fetch mudra' });
  }
});

// Delete Mudra
app.delete('/api/mudras/:id', async (req, res) => {
  try {
    const result = await Mudra.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Mudra not found' });
    res.json({ message: 'Mudra deleted successfully' });
  } catch (error) {
    console.error('Error deleting mudra:', error);
    res.status(500).json({ error: 'Failed to delete mudra' });
  }
});

// ---------- User Authentication Routes ----------

// Register new user
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const user = new User({ username, password });
    await user.save();
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    res.json({ message: 'Login successful', user });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ---------- Default Root ----------
app.get('/', (req, res) => {
  res.send('<h2>🎭 Rudrakalshethra Backend Running Successfully 🎭</h2>');
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`🚀 Rudrakalshethra Server Running on Port ${PORT}`);
});
