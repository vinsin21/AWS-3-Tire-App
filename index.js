// Load environment variables from a .env file
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 8080;

// --- Middleware ---
// Enable CORS for our React frontend
app.use(cors({ origin: 'http://visitor-log-frontend-app-12331.s3-website.ap-south-1.amazonaws.com' })); // For learning, '*' is fine. For production, lock this down.
// Enable parsing of JSON request bodies
app.use(express.json());


// --- Database Connection ---
// The 'pg' library will automatically use environment variables for connection details.
// See: https://node-postgres.com/features/connecting#environment-variables
// Required ENV Vars: PGHOST, PGUSER, PGDATABASE, PGPASSWORD, PGPORT
const pool = new Pool();


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
        res.status(500).json({ error: 'Internal Server Error' });
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
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /check-ip - Makes an outbound call to test the NAT Gateway
app.get('/check-ip', async (req, res) => {
    try {
        // This external API returns the public IP of the machine making the request.
        // In our AWS setup, this will be the IP of our NAT Gateway.
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