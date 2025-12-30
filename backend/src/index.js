import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// CORS configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL_LOCAL || 'http://localhost:5173',
    process.env.FRONTEND_URL_PROD || ''
  ].filter(Boolean),
  methods: ['GET', 'POST'],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Large limit for document uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply rate limiting to API routes
app.use('/api', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
import classifyRouter from './routes/classify.js';
import analyzeRouter from './routes/analyze.js';
import uploadRouter from './routes/upload.js';

app.use('/api/classify', classifyRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/upload', uploadRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 Gemini API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`);
});
