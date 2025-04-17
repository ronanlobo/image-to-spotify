/**
 * ImageToMusic API Server
 * Express server handling API requests for image analysis and music recommendations
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

// Import routes
const analysisRoutes = require('./routes/analysis');
const spotifyRoutes = require('./routes/spotify');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Check if running in production (Vercel)
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for Vercel deployment (important for secure cookies)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET || 'your-secret-key'));

// Log environment info
console.log(`Server starting in ${isProduction ? 'production' : 'development'} mode`);
console.log(`Session cookie secure: ${isProduction}`);

// Create a custom session store that enhances the memory store
const MemoryStore = session.MemoryStore;
const sessionStore = new MemoryStore();

// Log session activity for debugging
sessionStore.on('error', function(error) {
  console.error('Session store error:', error);
});

// Session configuration for Spotify authentication
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'spotify.sid', // Custom name to avoid conflicts
  cookie: { 
    secure: isProduction, // true in production
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site requests in prod
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/' // Set to root so it's available everywhere
  },
  // Use existing session ID if present in cookies to maintain persistence
  genid: function(req) {
    if (req.cookies && req.cookies['spotify.sid']) {
      const existingId = req.cookies['spotify.sid'].split('.')[0];
      console.log('Reusing existing session ID:', existingId);
      return existingId;
    }
    const newId = crypto.randomBytes(16).toString('hex');
    console.log('Generated new session ID:', newId);
    return newId;
  }
}));

// Add session debugging middleware
app.use((req, res, next) => {
  const sessionId = req.sessionID;
  console.log(`Request path: ${req.path}, Session ID: ${sessionId}`);
  console.log(`Session authenticated: ${req.session && req.session.passport ? 'Yes' : 'No'}`);
  
  // Add a hook to log response cookies
  const originalSetCookie = res.setHeader;
  res.setHeader = function(name, value) {
    if (name === 'Set-Cookie') {
      console.log('Setting cookies:', value);
    }
    return originalSetCookie.apply(this, arguments);
  };
  
  next();
});

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/analysis', analysisRoutes);
app.use('/api/spotify', spotifyRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    sessionStore: {
      type: 'memory',
      sessionsCount: Object.keys(sessionStore.sessions || {}).length
    }
  });
});

// Serve the main index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Start server (only when running directly, not when imported by Vercel)
if (process.env.NODE_ENV !== 'production' || require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless function
module.exports = app; 