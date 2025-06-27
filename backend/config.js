const dotenv = require('dotenv');
const path = require('path');

// Load .env.local first, then fall back to .env
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

// Export environment variables
module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  openaiApiKey: process.env.OPENAI_API_KEY,
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  spotifyRedirectUri: process.env.SPOTIFY_REDIRECT_URI,
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key'
}; 