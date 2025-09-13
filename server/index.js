require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Camp = require('./models/Camp');
const Room = require('./models/Room');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('Connected to MongoDB Atlas');
  console.log('Connected to DB:', mongoose.connection.name);
  console.log('DB Host:', mongoose.connection.host);
  console.log('DB Collections:', (await mongoose.connection.db.listCollections().toArray()).map(c => c.name));
  await seedInitialData();
})
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/camps', require('./routes/camps'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/users', require('./routes/users'));

// Basic route for testing
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', database: 'Connected to MongoDB Atlas' });
});

// Test users route
app.get('/api/test-users', async (req, res) => {
  try {
    const users = await User.find({}, '-password -__v');
    res.json(users);
  } catch (error) {
    console.error('Test users error:', error);
    res.status(500).json({ error: 'Failed to fetch test users' });
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../dist', 'index.html'));
  });
}

// Seed initial data
async function seedInitialData() {
  try {
    // Check if we already have data
    const campCount = await Camp.countDocuments();
    if (campCount === 0) {
      console.log('Seeding initial data...');
      
      // Create sample camps
      const camp1 = new Camp({
        name: 'Mountain View Camp',
        location: 'Swat Valley',
        description: 'Beautiful camp with stunning mountain views',
        price: 5000,
        image: 'https://example.com/mountain-view.jpg',
        rating: 4.5
      });

      const camp2 = new Camp({
        name: 'Lakeside Retreat',
        location: 'Naran',
        description: 'Peaceful camp by the lake',
        price: 4500,
        image: 'https://example.com/lake-view.jpg',
        rating: 4.2
      });

      const [savedCamp1, savedCamp2] = await Promise.all([
        camp1.save(),
        camp2.save()
      ]);

      // Create sample rooms
      const room1 = new Room({
        camp: savedCamp1._id,
        roomNumber: 'MV-101',
        type: 'double',
        capacity: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Bathroom'],
        isAvailable: true,
        description: 'Cozy double room with mountain view'
      });

      const room2 = new Room({
        camp: savedCamp2._id,
        roomNumber: 'LR-201',
        type: 'family',
        capacity: 4,
        price: 4500,
        amenities: ['AC', 'TV', 'WiFi', 'Bathroom', 'Kitchen'],
        isAvailable: true,
        description: 'Spacious family room with lake view'
      });

      await Promise.all([room1.save(), room2.save()]);
      console.log('Initial data seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding initial data:', error);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
