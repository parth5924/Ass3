const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

app.use(bodyParser.json());
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
});

// MongoDB connection
mongoose.connect('mongodb+srv://12216019:parth5924@cluster0.be44lcs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.log('MongoDB connection error:', err));

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
});

const TaskSchema = new mongoose.Schema({
    title: String,
    description: String,
    dueDate: Date,
    priority: String,
    completed: Boolean,
    userId: mongoose.Schema.Types.ObjectId,
});

const User = mongoose.model('User', UserSchema);
const Task = mongoose.model('Task', TaskSchema);

// Middleware for verifying tokens
const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('Access denied. No token provided.');

    try {
        const decoded = jwt.verify(token, 'your_jwt_secret');
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).send('Invalid token.');
    }
};

// User registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    let user = await User.findOne({ username });
    if (user) return res.status(400).send('User already registered.');

    user = new User({
        username,
        password: await bcrypt.hash(password, 10),
    });

    await user.save();

    res.send('User registered successfully.');
});

// User login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).send('Invalid username or password.');

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send('Invalid username or password.');

    const token = jwt.sign({ _id: user._id }, 'your_jwt_secret');
    res.send({ token });
});

// Get tasks for the logged-in user
app.get('/tasks', authMiddleware, async (req, res) => {
    const tasks = await Task.find({ userId: req.user._id });
    res.json(tasks);
});

// Create a task for the logged-in user
app.post('/tasks', authMiddleware, async (req, res) => {
    const newTask = new Task({
        ...req.body,
        userId: req.user._id,
    });

    await newTask.save();
    res.json(newTask);
});

// Update a task
app.put('/tasks/:id', authMiddleware, async (req, res) => {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedTask);
});

// Delete a task
app.delete('/tasks/:id', authMiddleware, async (req, res) => {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
