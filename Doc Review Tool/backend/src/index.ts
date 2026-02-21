import express, { type ErrorRequestHandler } from 'express';
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
  message: 'Too many requests from this IP, please try again later.',
});

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin:
    process.env.CORS_ORIGIN === '*'
      ? '*'
      : [
          process.env.FRONTEND_URL_LOCAL || 'http://localhost:5173',
          process.env.FRONTEND_URL_PROD || 'https://mmmuller93.github.io',
          'https://mmmuller93.github.io',
          'https://tools.strategicfundpartners.com',
        ].filter(Boolean),
  methods: ['GET', 'POST'],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply rate limiting to API routes
app.use('/api', limiter);

// Health check — includes pipeline version info for feature flag
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    pipelines: {
      v1: { available: !!process.env.GEMINI_API_KEY, engine: 'gemini' },
      v2: {
        available: !!(process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY),
        engine: 'multi-provider',
        models: ['haiku-4.5', 'sonnet-4.6', 'gpt-5.2'],
      },
    },
  });
});

// API routes
import classifyRouter from './routes/classify';
import analyzeRouter from './routes/analyze';
import uploadRouter from './routes/upload';
import chatRouter from './routes/chat';
import analyzeV2Router from './routes/analyze-v2';
import multiDocRouter from './routes/multi-doc';

app.use('/api/classify', classifyRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/chat', chatRouter);
app.use('/api/v2/analyze', analyzeV2Router);
app.use('/api/v2/multi-doc', multiDocRouter);

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? (err as Error).message : undefined,
  });
};
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Gemini API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`);
  console.log(`Anthropic API Key configured: ${process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No'}`);
  console.log(`OpenAI API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});
