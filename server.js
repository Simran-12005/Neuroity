const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Path to store results
const DATA_DIR = path.join(__dirname, 'data');
const RESULTS_FILE = path.join(DATA_DIR, 'results.json');

// Ensure data directory exists
async function initDataDirectory() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        // Create empty results file if it doesn't exist
        try {
            await fs.access(RESULTS_FILE);
        } catch {
            await fs.writeFile(RESULTS_FILE, JSON.stringify([]));
        }
    } catch (error) {
        console.error('Error initializing data directory:', error);
    }
}

// Read results from file
async function readResults() {
    try {
        const data = await fs.readFile(RESULTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading results:', error);
        return [];
    }
}

// Write results to file
async function writeResults(results) {
    try {
        await fs.writeFile(RESULTS_FILE, JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('Error writing results:', error);
    }
}

// API Routes

// Save a new result
app.post('/api/results', async (req, res) => {
    try {
        const result = {
            ...req.body,
            id: Date.now().toString(),
            timestamp: new Date().toISOString()
        };

        const results = await readResults();
        results.push(result);
        await writeResults(results);

        res.status(201).json({
            success: true,
            message: 'Result saved successfully',
            result: result
        });
    } catch (error) {
        console.error('Error saving result:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save result'
        });
    }
});

// Get all results
app.get('/api/results', async (req, res) => {
    try {
        const results = await readResults();
        res.json(results);
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch results'
        });
    }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const results = await readResults();
        
        if (results.length === 0) {
            return res.json({
                totalParticipants: 0,
                averageScore: 0,
                categoryDistribution: {},
                todayCount: 0
            });
        }

        // Calculate average score
        const totalScore = results.reduce((sum, r) => sum + r.score, 0);
        const averageScore = totalScore / results.length;

        // Category distribution
        const categoryDistribution = results.reduce((acc, r) => {
            acc[r.category] = (acc[r.category] || 0) + 1;
            return acc;
        }, {});

        // Today's count
        const today = new Date().toDateString();
        const todayCount = results.filter(r => 
            new Date(r.timestamp).toDateString() === today
        ).length;

        res.json({
            totalParticipants: results.length,
            averageScore: parseFloat(averageScore.toFixed(2)),
            categoryDistribution,
            todayCount,
            recentResults: results.slice(-10).reverse() // Last 10 results
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

// Delete all results (admin only)
app.delete('/api/results', async (req, res) => {
    try {
        // In production, add authentication here
        await writeResults([]);
        res.json({
            success: true,
            message: 'All results cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear results'
        });
    }
});

// Delete single result
app.delete('/api/results/:id', async (req, res) => {
    try {
        const results = await readResults();
        const filteredResults = results.filter(r => r.id !== req.params.id);
        
        if (filteredResults.length === results.length) {
            return res.status(404).json({
                success: false,
                message: 'Result not found'
            });
        }

        await writeResults(filteredResults);
        res.json({
            success: true,
            message: 'Result deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting result:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete result'
        });
    }
});

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'questionnaire.html'));
});

app.get('/questionnaire', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'questionnaire.html'));
});

app.get('/result', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'result.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start server
async function startServer() {
    await initDataDirectory();
    
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Questionnaire: http://localhost:${PORT}`);
        console.log(`Admin panel: http://localhost:${PORT}/admin`);
    });
}

startServer();