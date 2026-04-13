require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const Zone = require('./models/Zone');
const Order = require('./models/Order');
const Alert = require('./models/Alert');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// In-Memory Fallback State (used if MongoDB fails to connect)
let memoryZones = [
  { _id: '1', name: 'North Concourse Restroom', currentDensity: 85, estimatedWaitTime: 12, capacity: 50 },
  { _id: '2', name: 'Burger & Fries Stand', currentDensity: 40, estimatedWaitTime: 5, capacity: 100 },
  { _id: '3', name: 'South Exit Gate', currentDensity: 20, estimatedWaitTime: 1, capacity: 200 }
];
let memoryOrders = [];
let memoryAlerts = [];

const isDbConnected = () => mongoose.connection.readyState === 1;

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-stadium';
let dbConnected = false;
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    dbConnected = true;
  })
  .catch(err => {
    console.log('MongoDB connection error. Falling back to IN-MEMORY logic.', err.message);
  });

// REST APIs
app.get('/api/zones', async (req, res) => {
  if (!isDbConnected()) return res.json(memoryZones);
  try {
    const zones = await Zone.find();
    res.json(zones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  if (!isDbConnected()) {
    const newOrder = { ...req.body, _id: Date.now().toString(), createdAt: new Date() };
    memoryOrders.unshift(newOrder); // prepending
    io.emit('new_order', newOrder);
    return res.status(201).json(newOrder);
  }
  try {
    const newOrder = new Order(req.body);
    const savedOrder = await newOrder.save();
    io.emit('new_order', savedOrder);
    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  if (!isDbConnected()) return res.json(memoryOrders.slice(0, 50));
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(50);
    res.json(orders);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/alerts', async (req, res) => {
  if (!isDbConnected()) return res.json(memoryAlerts.filter(a => a.isActive).slice(0, 3));
  try {
    const alerts = await Alert.find({ isActive: true }).sort({ createdAt: -1 }).limit(3);
    res.json(alerts);
  } catch (err) {
    res.json([]);
  }
});

app.delete('/api/alerts/:id', async (req, res) => {
  if (!isDbConnected()) {
    const alert = memoryAlerts.find(a => a._id === req.params.id);
    if (alert) alert.isActive = false;
    io.emit('alert_dismissed', req.params.id);
    return res.status(200).json({ success: true });
  }
  try {
    await Alert.findByIdAndUpdate(req.params.id, { isActive: false });
    io.emit('alert_dismissed', req.params.id);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/alerts', async (req, res) => {
  if (!isDbConnected()) {
    const newAlert = { ...req.body, _id: Date.now().toString(), isActive: true, createdAt: new Date() };
    memoryAlerts.unshift(newAlert);
    io.emit('emergency_alert', newAlert);
    return res.status(201).json(newAlert);
  }
  try {
    const newAlert = new Alert(req.body);
    const savedAlert = await newAlert.save();
    io.emit('emergency_alert', savedAlert);
    res.status(201).json(savedAlert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebSocket logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  socket.on('update_density', async (data) => {
    try {
      if (!isDbConnected()) {
        let z = memoryZones.find(x => x._id === data.zoneId);
        if (z) {
          z.currentDensity = data.density; z.estimatedWaitTime = data.waitTime; z.lastUpdated = Date.now();
          io.emit('density_update', z);
        } else {
          io.emit('density_update', { _id: data.zoneId, currentDensity: data.density, estimatedWaitTime: data.waitTime });
        }
        return;
      }

      let updatedZone = null;
      if (mongoose.Types.ObjectId.isValid(data.zoneId)) {
        updatedZone = await Zone.findByIdAndUpdate(
          data.zoneId, 
          { currentDensity: data.density, estimatedWaitTime: data.waitTime, lastUpdated: Date.now() },
          { new: true }
        );
      }
      
      if (updatedZone) {
        io.emit('density_update', updatedZone);
      } else {
        io.emit('density_update', { _id: data.zoneId, currentDensity: data.density, estimatedWaitTime: data.waitTime });
      }
    } catch (err) {
      console.log('Update density error:', err);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Smart Stadium Backend running on port ${PORT}`);
});
