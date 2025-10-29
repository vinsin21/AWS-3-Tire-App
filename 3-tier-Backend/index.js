// REMOVED: require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const axios = require('axios');

// NEW: Import the AWS SSM client
const { SSMClient, GetParametersCommand } = require("@aws-sdk/client-ssm");

const app = express();
const port = process.env.PORT || 8080;

// NEW: Define variables for the pool and secrets, to be set later
let pool;
let corsOrigin;

// --- Database Initialization ---
// This function will be called *after* the 'pool' variable is created
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
        process.exit(1); // Exit if DB init fails
    }
};

// --- API Endpoints ---
// All routes are wrapped in a function so we can call it *after* the pool is ready
const setupRoutes = () => {
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
};


// --- NEW: Main async startup function ---
const startApp = async () => {
    try {
        // 1. Fetch Secrets from SSM
        console.log("Fetching secrets from SSM...");

        // The region is automatically detected from the EC2 instance's IAM role
        // Make sure your IAM Role has ssm:GetParameters permission
        const ssmClient = new SSMClient();

        // Define all parameter names you need
        // ** Make sure these names are correct! **
        const paramNames = [
            '/myapp/PGHOST',
            '/myapp/PGUSER',
            '/myapp/PGDATABASE',
            '/myapp/PGPASSWORD',
            '/myapp/PGPORT',
            '/myapp/CORS_ORIGIN' // Make sure you also store CORS_ORIGIN in SSM
        ];

        const command = new GetParametersCommand({
            Names: paramNames,
            WithDecryption: true // This is crucial for SecureString parameters
        });

        const ssmResponse = await ssmClient.send(command);

        // Check if any parameters were not found
        if (ssmResponse.InvalidParameters && ssmResponse.InvalidParameters.length > 0) {
            throw new Error(`Could not find parameters: ${ssmResponse.InvalidParameters.join(', ')}`);
        }

        // Map the flat array of parameters into an easy-to-use 'secrets' object
        const secrets = {};
        ssmResponse.Parameters.forEach(param => {
            const key = param.Name.split('/').pop(); // Turns '/myapp/PGHOST' into 'PGHOST'
            secrets[key] = param.Value;
        });

        console.log("✅ Secrets fetched successfully.");
        // Use the secret, or a fallback for local testing (though this won't be hit in production)
        corsOrigin = secrets.CORS_ORIGIN || 'http://localhost:3000';

        // 2. Initialize Database Pool (now that we have secrets)
        console.log("Connecting to database...");
        pool = new Pool({
            host: secrets.PGHOST,
            user: secrets.PGUSER,
            database: secrets.PGDATABASE,
            password: secrets.PGPASSWORD,
            port: secrets.PGPORT,
            ssl: {
                rejectUnauthorized: false
            }
        });

        // 3. Setup Middleware (now that we have CORS origin)
        app.use(cors({ origin: corsOrigin }));
        app.use(express.json());

        // 4. Initialize the database schema
        await initializeDatabase(); // This function now uses the 'pool' we just created

        // 5. Setup all API routes
        setupRoutes(); // This function also uses the 'pool'

        // 6. Start the server
        app.listen(port, () => {
            console.log(`🚀 Server listening on port ${port}`);
        });

    } catch (error) {
        console.error("❌ Fatal error: Failed to start application:", error);
        process.exit(1); // Exit the container if startup fails
    }
};

// --- Start Server ---
// This one line now runs the entire startup process
startApp();
