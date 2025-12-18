import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import translateRoutes from './routes/translate.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - Allow frontend to access
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Translation routes
app.use('/api/translate', translateRoutes);

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 Translation API running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
