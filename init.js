// Initialize Admin Accounts Script
// Run this once to create default admin and manager accounts

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoURI = process.env.MONGO_URI || 'mongodb+srv://ajithtest95:ajith%40123@cluster0.n3qvh.mongodb.net/rudrakalshethra?retryWrites=true&w=majority';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'student'], required: true },
  branch: { type: String, enum: ['all', 'kothavara', 'ambikamarket', 'edayazham'], default: 'all' },
  phone: String,
  joinDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

const User = mongoose.model('User', userSchema);

const defaultAccounts = [
  {
    name: 'Main Admin',
    email: 'admin@rudrakalshethra.com',
    password: '123',
    role: 'admin',
    branch: 'all',
    phone: '9999999999'
  },
  {
    name: 'Kothavara Manager',
    email: 'admin1@rudrakalshethra.com',
    password: '123',
    role: 'manager',
    branch: 'kothavara',
    phone: '9999999991'
  },
  {
    name: 'Ambikamarket Manager',
    email: 'admin2@rudrakalshethra.com',
    password: '123',
    role: 'manager',
    branch: 'ambikamarket',
    phone: '9999999992'
  },
  {
    name: 'Edayazham Manager',
    email: 'admin3@rudrakalshethra.com',
    password: '123',
    role: 'manager',
    branch: 'edayazham',
    phone: '9999999993'
  }
];

async function initializeAccounts() {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');

    for (const account of defaultAccounts) {
      const existingUser = await User.findOne({ email: account.email });
      
      if (existingUser) {
        console.log(`⚠️  Account already exists: ${account.email}`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(account.password, 10);
      const user = new User({
        ...account,
        password: hashedPassword
      });

      await user.save();
      console.log(`✅ Created account: ${account.email} (${account.role} - ${account.branch})`);
    }

    console.log('\n🎉 Initialization complete!');
    console.log('\nDefault Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Main Admin:');
    console.log('  Email: admin@rudrakalshethra.com');
    console.log('  Password: 123');
    console.log('\nKothavara Manager:');
    console.log('  Email: admin1@rudrakalshethra.com');
    console.log('  Password: 123');
    console.log('\nAmbikamarket Manager:');
    console.log('  Email: admin2@rudrakalshethra.com');
    console.log('  Password: 123');
    console.log('\nEdayazham Manager:');
    console.log('  Email: admin3@rudrakalshethra.com');
    console.log('  Password: 123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initializeAccounts();