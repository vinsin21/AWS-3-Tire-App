// Load environment variables from a .env file
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 8080;

// --- Middleware ---
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

// --- Database Connection with SSL ---
const pool = new Pool({
    ssl: {
        rejectUnauthorized: false  // For AWS RDS, this is safe
    }
});

// --- Database Initialization ---
const initializeDatabase = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS visitors (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Database initialized successfully');

        // Test connection
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Database connected at:', result.rows[0].now);
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        process.exit(1);
    }
};

// Initialize database
initializeDatabase();

// --- API Endpoints ---

// Health check endpoint
app.get('/', (req, res) => {
    res.status(200).send('Backend is running!');
});

// GET /visitors - Fetches all visitors from the database
app.get('/visitors', async (req, res) => {
    try {
        const result = await pool.query('SELECT name FROM visitors ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching visitors:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// POST /visitors - Adds a new visitor to the database
app.post('/visitors', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        await pool.query('INSERT INTO visitors (name) VALUES ($1)', [name]);
        res.status(201).json({ message: 'Visitor added successfully' });
    } catch (error) {
        console.error('Error adding visitor:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// GET /check-ip - Makes an outbound call to test the NAT Gateway
app.get('/check-ip', async (req, res) => {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        res.status(200).json({
            message: "Outbound call successful! This is the public IP of the server.",
            ip: response.data.ip
        });
    } catch (error) {
        console.error('Error checking IP:', error);
        res.status(500).json({ error: 'Failed to make outbound call' });
    }
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});