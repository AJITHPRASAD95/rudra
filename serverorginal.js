// --- Rudrakalshethra Backend ---
// Full working backend for Bharatanatyam Mudra theory app

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

// Static folders
app.use('/uploads', express.static('uploads'));
app.use(express.static('public')); // Serve index.html and other static files from /public

// ---------- MongoDB Connection ----------
// NOTE: Ensure your environment variables are set, or the direct string is valid.
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
    // Ensure you have an 'uploads' folder in your project root!
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const fileName = Date.now() + '-' + file.originalname;
    cb(null, fileName);
  },
});

const upload = multer({ storage });

// ---------- Mongoose Schema ----------
const mudraSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // FIX: Changed 'type' to 'category' to match the frontend form data.
  category: { type: String, required: true, enum: ['Asamyukta Hasta', 'Samyukta Hasta'] }, 
  meaning: { type: String }, // Usage from frontend form
  description: { type: String },
  image: { type: String }, // Image URL/path from frontend form
  theory: { type: String }, // Full text explanation/theory (not used by current frontend form, but good for completeness)
  createdAt: { type: Date, default: Date.now },
});

const Mudra = mongoose.model('Mudra', mudraSchema);

// ---------- Routes ----------

// 🌺 Add New Mudra Theory
app.post('/api/mudras', async (req, res) => {
  try {
    // FIX: Destructuring 'category' instead of 'type'
    const { name, category, meaning, description, image, theory } = req.body;

    // The frontend form provides: name, category, description, usage (which maps to meaning), and imageUrl (which maps to image).
    const mudra = new Mudra({ 
      name, 
      category, 
      meaning, // 'usage' from frontend is saved as 'meaning' in schema
      description, 
      image, // 'imageUrl' from frontend is saved as 'image' in schema
      theory // This would be missing unless added to the form, but model accepts it
    });

    await mudra.save();
    res.status(201).json({ message: 'Mudra theory added successfully', mudra });
  } catch (error) {
    console.error('❌ Error adding mudra:', error);
    // Send a more informative error for validation failure
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to add mudra theory' });
  }
});

// 🌼 Get All Mudras
app.get('/api/mudras', async (req, res) => {
  try {
    const mudras = await Mudra.find().sort({ createdAt: -1 });
    res.json(mudras);
  } catch (error) {
    console.error('❌ Error fetching mudras:', error);
    res.status(500).json({ error: 'Failed to fetch mudras' });
  }
});

// 🌻 Get Mudra by ID
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

// 🌷 Update Mudra
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

// 🌼 Delete Mudra
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

// 🌻 Filter by Mudra Type (Asamyukta / Samyukta)
// FIX: Changed route parameter and query field from 'type' to 'category'
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

// 🌿 Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Rudrakalshethra Mudra Theory API running fine',
    timestamp: new Date().toISOString(),
  });
});

// 🌸 Root Route (Serves index.html if configured correctly in public folder)
app.get('/', (req, res) => {
  res.send(`
    <h2>🎭 Rudrakalshethra Mudra Theory Server Running 🎭</h2>
    <p>Server running on Port ${PORT}. Check <a href="/api/mudras">/api/mudras</a> for data.</p>
  `);
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`🚀 Rudrakalshethra Server Running on Port ${PORT}`);
});