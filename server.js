const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your_jwt_secret_key_here';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection with better error handling
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ajithtest95:ajith%40123@cluster0.n3qvh.mongodb.net/rudrakalshethra?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 10s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => {
    console.log('❌ MongoDB Connection Error:', err.message);
    console.log('\n💡 Please make sure MongoDB is running:');
    console.log('   - On Windows: Run "net start MongoDB" as Administrator');
    console.log('   - On macOS: Run "brew services start mongodb-community"');
    console.log('   - On Linux: Run "sudo systemctl start mongod"');
    console.log('   - Or use MongoDB Atlas (cloud)');
});

// Schemas and Models
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'student'], required: true },
    branch: { type: String, enum: ['kothavara', 'ambikamarket', 'edayazham', 'all'], default: 'all' },
    phone: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const studentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: String, required: true },
    feePerClass: { type: Number, default: 400 },
    totalClassesAttended: { type: Number, default: 0 },
    unpaidClasses: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
});

const attendanceSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    date: { type: Date, required: true },
    present: { type: Boolean, default: true },
    branch: { type: String, required: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const paymentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    paymentDate: { type: Date, default: Date.now },
    classesCount: { type: Number, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'online', 'card'], default: 'cash' },
    branch: { type: String, required: true },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const mudraSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    meaning: { type: String, required: true },
    image: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const theorySchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    content: { type: String, required: true },
    icon: { type: String, default: '📚' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Student = mongoose.model('Student', studentSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Mudra = mongoose.model('Mudra', mudraSchema);
const Theory = mongoose.model('Theory', theorySchema);

// Check MongoDB connection before handling requests
const checkMongoDBConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ 
            error: 'Database connection not available. Please check if MongoDB is running.' 
        });
    }
    next();
};

// Auth Middleware
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.userId).select('-password');
        if (!req.user) {
            return res.status(401).json({ error: 'Token is not valid' });
        }
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};

// Role-based middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
};

// Initialize default data
async function initializeDefaultData() {
    try {
        // Check MongoDB connection first
        if (mongoose.connection.readyState !== 1) {
            console.log('⚠️  MongoDB not connected, skipping default data initialization');
            return;
        }

        // Check if admin exists
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new User({
                name: 'Admin',
                email: 'admin@rudrakalshethra.com',
                password: hashedPassword,
                role: 'admin',
                branch: 'all'
            });
            await admin.save();
            console.log('✅ Default admin created');
        }

        // Check if sample mudras exist
        const mudrasCount = await Mudra.countDocuments();
        if (mudrasCount === 0) {
            const sampleMudras = [
                {
                    name: 'Pataka',
                    category: 'Asamyukta Hasta',
                    description: 'All fingers extended and held together, thumb bent and touching the base of the index finger',
                    meaning: 'Flag, forest, river, night, horse, cutting, wind, reclining, moonlight, strong sunlight, forcing open doors, wave, swimming, goodbye'
                },
                {
                    name: 'Tripataka',
                    category: 'Asamyukta Hasta',
                    description: 'Same as Pataka but with ring finger bent',
                    meaning: 'Crown, tree, fire, lightning, lamp, waving lights, marriage, a king, turning'
                },
                {
                    name: 'Ardhapataka',
                    category: 'Asamyukta Hasta',
                    description: 'Same as Tripataka but with little finger bent',
                    meaning: 'Leaves, bank of river, knife, tower, horn, banner, writing'
                }
            ];
            await Mudra.insertMany(sampleMudras);
            console.log('✅ Sample mudras added');
        }

        // Check if sample theory exists
        const theoryCount = await Theory.countDocuments();
        if (theoryCount === 0) {
            const sampleTheory = [
                {
                    title: 'Introduction to Bharatanatyam',
                    category: 'Basics',
                    description: 'Overview of Bharatanatyam dance form',
                    content: 'Bharatanatyam is a classical Indian dance form that originated in the temples of Tamil Nadu. It is known for its fixed upper torso, legs bent or knees flexed out combined with spectacular footwork, a sophisticated vocabulary of sign language based on gestures of hands, eyes and face muscles.',
                    icon: '💃'
                },
                {
                    title: 'Tala System',
                    category: 'Rhythm',
                    description: 'Understanding rhythmic patterns in Bharatanatyam',
                    content: 'Tala in Indian classical music refers to the rhythmic pattern of any composition. The most common tala in Bharatanatyam is Adi Tala which has 8 beats.',
                    icon: '🥁'
                },
                {
                    title: 'Abhinaya - The Art of Expression',
                    category: 'Expression',
                    description: 'Learning facial expressions and storytelling',
                    content: 'Abhinaya is the art of expression in Indian classical dance. It involves conveying stories and emotions through facial expressions, hand gestures, and body movements.',
                    icon: '🎭'
                }
            ];
            await Theory.insertMany(sampleTheory);
            console.log('✅ Sample theory added');
        }
    } catch (error) {
        console.error('Error initializing default data:', error.message);
    }
}

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({ 
        status: 'OK', 
        database: dbStatus,
        timestamp: new Date().toISOString()
    });
});

// Auth Routes
app.post('/api/auth/login', checkMongoDBConnection, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                branch: user.branch
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Dashboard Stats
app.get('/api/dashboard/stats', authMiddleware, checkMongoDBConnection, async (req, res) => {
    try {
        const { branch } = req.query;
        let branchFilter = {};

        if (branch && branch !== 'all') {
            branchFilter.branch = branch;
        }

        if (req.user.role === 'manager') {
            branchFilter.branch = req.user.branch;
        }

        // Get student stats
        const students = await Student.find(branchFilter).populate('userId');
        const totalStudents = students.length;
        const activeStudents = students.filter(s => s.isActive).length;
        const studentsPayable = students.filter(s => s.unpaidClasses >= 4).length;
        const totalPending = students.reduce((sum, student) => sum + student.pendingAmount, 0);

        // Get recent revenue (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentPayments = await Payment.find({
            ...branchFilter,
            paymentDate: { $gte: thirtyDaysAgo }
        });
        const recentRevenue = recentPayments.reduce((sum, payment) => sum + payment.amount, 0);

        res.json({
            totalStudents,
            activeStudents,
            studentsPayable,
            totalPending,
            recentRevenue
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Student Routes
app.get('/api/students', authMiddleware, checkMongoDBConnection, async (req, res) => {
    try {
        let filter = {};
        
        if (req.user.role === 'manager') {
            filter.branch = req.user.branch;
        } else if (req.query.branch && req.query.branch !== 'all') {
            filter.branch = req.query.branch;
        }

        const students = await Student.find(filter).populate('userId');
        res.json(students);
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/students', authMiddleware, requireRole(['admin', 'manager']), checkMongoDBConnection, async (req, res) => {
    try {
        const { name, email, password, phone, branch, feePerClass } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        // Create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: 'student',
            phone,
            branch
        });
        await user.save();

        // Create student record
        const student = new Student({
            userId: user._id,
            branch,
            feePerClass: feePerClass || 400
        });
        await student.save();

        const studentWithUser = await Student.findById(student._id).populate('userId');
        res.status(201).json(studentWithUser);
    } catch (error) {
        console.error('Create student error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/students/me', authMiddleware, requireRole(['student']), checkMongoDBConnection, async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user._id }).populate('userId');
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Get attendance records
        const attendanceRecords = await Attendance.find({ studentId: student._id })
            .sort({ date: -1 })
            .limit(20);

        // Get payment records
        const paymentRecords = await Payment.find({ studentId: student._id })
            .sort({ paymentDate: -1 })
            .limit(20);

        res.json({
            student,
            attendanceRecords,
            paymentRecords
        });
    } catch (error) {
        console.error('Get student data error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Attendance Routes
app.get('/api/attendance', authMiddleware, checkMongoDBConnection, async (req, res) => {
    try {
        let filter = {};
        
        if (req.user.role === 'manager') {
            filter.branch = req.user.branch;
        } else if (req.query.branch && req.query.branch !== 'all') {
            filter.branch = req.query.branch;
        }

        const attendance = await Attendance.find(filter)
            .populate('studentId')
            .populate('markedBy', 'name')
            .sort({ date: -1 })
            .limit(50);
        res.json(attendance);
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/attendance', authMiddleware, requireRole(['admin', 'manager']), checkMongoDBConnection, async (req, res) => {
    try {
        const { studentId, date, present } = req.body;

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Check if attendance already marked for this date
        const existingAttendance = await Attendance.findOne({
            studentId,
            date: new Date(date)
        });

        if (existingAttendance) {
            return res.status(400).json({ error: 'Attendance already marked for this date' });
        }

        // Create attendance record
        const attendance = new Attendance({
            studentId,
            date: new Date(date),
            present,
            branch: student.branch,
            markedBy: req.user._id
        });
        await attendance.save();

        // Update student stats if present
        if (present) {
            student.totalClassesAttended += 1;
            student.unpaidClasses += 1;
            student.pendingAmount = student.unpaidClasses * student.feePerClass;
            await student.save();
        }

        res.status(201).json(attendance);
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Payment Routes
app.get('/api/payments', authMiddleware, checkMongoDBConnection, async (req, res) => {
    try {
        let filter = {};
        
        if (req.user.role === 'manager') {
            filter.branch = req.user.branch;
        } else if (req.query.branch && req.query.branch !== 'all') {
            filter.branch = req.query.branch;
        }

        const payments = await Payment.find(filter)
            .populate('studentId')
            .populate('receivedBy', 'name')
            .sort({ paymentDate: -1 })
            .limit(50);
        res.json(payments);
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/payments', authMiddleware, requireRole(['admin', 'manager']), checkMongoDBConnection, async (req, res) => {
    try {
        const { studentId, classesCount, paymentMethod } = req.body;

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        if (student.unpaidClasses < classesCount) {
            return res.status(400).json({ error: 'Not enough unpaid classes' });
        }

        const amount = classesCount * student.feePerClass;

        // Create payment record
        const payment = new Payment({
            studentId,
            classesCount,
            amount,
            paymentMethod,
            branch: student.branch,
            receivedBy: req.user._id
        });
        await payment.save();

        // Update student stats
        student.unpaidClasses -= classesCount;
        student.pendingAmount = student.unpaidClasses * student.feePerClass;
        student.totalPaid += amount;
        await student.save();

        res.status(201).json(payment);
    } catch (error) {
        console.error('Record payment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mudra Routes - No auth required for viewing
app.get('/api/mudras', checkMongoDBConnection, async (req, res) => {
    try {
        const mudras = await Mudra.find().sort({ name: 1 });
        res.json(mudras);
    } catch (error) {
        console.error('Get mudras error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/mudras', authMiddleware, requireRole(['admin', 'manager']), checkMongoDBConnection, async (req, res) => {
    try {
        const { name, category, description, meaning, image } = req.body;

        const mudra = new Mudra({
            name,
            category,
            description,
            meaning,
            image
        });
        await mudra.save();

        res.status(201).json(mudra);
    } catch (error) {
        console.error('Create mudra error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Theory Routes - No auth required for viewing
app.get('/api/theory', checkMongoDBConnection, async (req, res) => {
    try {
        const theories = await Theory.find().sort({ title: 1 });
        res.json(theories);
    } catch (error) {
        console.error('Get theory error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/theory', authMiddleware, requireRole(['admin', 'manager']), checkMongoDBConnection, async (req, res) => {
    try {
        const { title, category, description, content, icon } = req.body;

        const theory = new Theory({
            title,
            category,
            description,
            content,
            icon: icon || '📚'
        });
        await theory.save();

        res.status(201).json(theory);
    } catch (error) {
        console.error('Create theory error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve HTML for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize data when MongoDB connects
mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB event connected - initializing default data');
    initializeDefaultData();
});

mongoose.connection.on('error', (err) => {
    console.log('❌ MongoDB event error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB event disconnected');
});

// Initialize and start server
async function startServer() {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📧 Default admin login: admin@rudrakalshethra.com / admin123`);
        console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
        console.log('\n💡 If you see MongoDB connection errors:');
        console.log('   1. Make sure MongoDB is installed and running');
        console.log('   2. Or use MongoDB Atlas (cloud) by setting MONGODB_URI environment variable');
    });
}

startServer().catch(console.error);