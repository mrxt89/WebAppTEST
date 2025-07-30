// Backend/routes/healthRoutes.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');
const config = require('../config');
const os = require('os');

// Health check endpoint
router.get('/health', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            used: process.memoryUsage(),
            free: os.freemem(),
            total: os.totalmem()
        },
        cpu: {
            loadAverage: os.loadavg(),
            cores: os.cpus().length
        },
        checks: {}
    };

    try {
        // Check database connection
        const pool = await sql.connect(config.database);
        await pool.request().query('SELECT 1');
        health.checks.database = 'ok';
        pool.close();
    } catch (error) {
        health.checks.database = 'error';
        health.status = 'unhealthy';
    }

    // Check memory usage
    const memoryUsagePercent = (1 - os.freemem() / os.totalmem()) * 100;
    if (memoryUsagePercent > 90) {
        health.status = 'unhealthy';
        health.checks.memory = 'critical';
    } else if (memoryUsagePercent > 80) {
        health.checks.memory = 'warning';
    } else {
        health.checks.memory = 'ok';
    }

    // Check CPU load (1 minute average)
    const cpuLoadPercent = (os.loadavg()[0] / os.cpus().length) * 100;
    if (cpuLoadPercent > 90) {
        health.status = 'unhealthy';
        health.checks.cpu = 'critical';
    } else if (cpuLoadPercent > 70) {
        health.checks.cpu = 'warning';
    } else {
        health.checks.cpu = 'ok';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});

// Detailed metrics endpoint (opzionale)
router.get('/health/metrics', async (req, res) => {
    const metrics = {
        timestamp: new Date().toISOString(),
        process: {
            pid: process.pid,
            version: process.version,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpuUsage: process.cpuUsage()
        },
        system: {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            memory: {
                free: os.freemem(),
                total: os.totalmem(),
                percent: Math.round((1 - os.freemem() / os.totalmem()) * 100)
            },
            cpu: {
                model: os.cpus()[0].model,
                cores: os.cpus().length,
                loadAverage: os.loadavg()
            }
        }
    };

    res.json(metrics);
});

module.exports = router;

