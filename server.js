const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serves your HTML file

// FINAL WORKING CONFIG FOR YOUR PC
const dbConfig = {
    user: 'sa',
    password: 'admin123',                    // ← your password
    server: '127.0.0.1',                     // ← THIS FIXES EVERYTHING
    port: 1433,                              // ← force TCP port
    database: 'GCashTrackerDB',
    options: {
        encrypt: false,                      // must be false for local SQL Server
        trustServerCertificate: true,        // ignores self-signed cert
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Auto-create database and table
async function setupDatabase() {
    try {
        const masterConfig = { ...dbConfig, database: 'master' };
        const pool = await sql.connect(masterConfig);
        await pool.query(`IF DB_ID('GCashTrackerDB') IS NULL CREATE DATABASE GCashTrackerDB`);
        await pool.close();

        await sql.connect(dbConfig);
        await sql.query(`
            IF OBJECT_ID('Transactions') IS NULL
            CREATE TABLE Transactions (
                Id BIGINT IDENTITY(1,1) PRIMARY KEY,
                DateTime DATETIME2 DEFAULT GETDATE(),
                Name NVARCHAR(100) NOT NULL,
                Mobile NVARCHAR(20),
                RefNo NVARCHAR(50),
                Type NVARCHAR(20),
                Amount DECIMAL(18,2) NOT NULL,
                Fee DECIMAL(18,2) NOT NULL
            )
        `);
        console.log('Database & table ready!');
    } catch (err) {
        console.log('DB setup (ignore if already exists):', err.message);
    }
}
setupDatabase();

// GET all transactions
app.get('/api/transactions', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`SELECT * FROM Transactions ORDER BY DateTime DESC`;
        res.json(result.recordset);
    } catch (err) {
        console.error('GET error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ADD new transaction
app.post('/api/transactions', async (req, res) => {
    try {
        const { name, mobile, ref, type, amount, fee } = req.body;
        await sql.connect(dbConfig);
        const result = await sql.query`
            INSERT INTO Transactions (Name, Mobile, RefNo, Type, Amount, Fee)
            OUTPUT INSERTED.Id
            VALUES (${name}, ${mobile}, ${ref}, ${type}, ${amount}, ${fee})
        `;
        res.json({ success: true, id: result.recordset[0].Id });
    } catch (err) {
        console.error('POST error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE transaction
app.delete('/api/transactions/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await sql.connect(dbConfig);
        await sql.query`DELETE FROM Transactions WHERE Id = ${id}`;
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE error:', err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server RUNNING → http://localhost:${PORT}`);
    console.log(`Open gcash-tracker.html now!`);
    console.log(`All data saved permanently in SQL Server`);
});