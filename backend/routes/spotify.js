/**
 * Spotify Routes
 * Handles Spotify authentication and playlist management
 */

const express = require('express');
const router = express.Router();
const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const axios = require('axios');

// Spotify API Configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

// Log configuration details
console.log('Spotify Auth Configuration:');
console.log(`- Client ID: ${SPOTIFY_CLIENT_ID ? 'Set ✓' : 'Not set ✗'}`);
console.log(`- Client Secret: ${SPOTIFY_CLIENT_SECRET ? 'Set ✓' : 'Not set ✗'}`);
console.log(`- Redirect URI: ${SPOTIFY_REDIRECT_URI || 'Not set ✗'}`);

// Configure Spotify Strategy
passport.use(
  new SpotifyStrategy(
    {
      clientID: SPOTIFY_CLIENT_ID,
      clientSecret: SPOTIFY_CLIENT_SECRET,
      callbackURL: SPOTIFY_REDIRECT_URI,
      scope: ['user-read-email', 'user-library-modify', 'playlist-modify-public', 'playlist-modify-private']
    },
    (accessToken, refreshToken, expires_in, profile, done) => {
      console.log('Spotify authentication successful');
      console.log(`- User: ${profile.id} (${profile.displayName})`);
      console.log(`- Access Token: ${accessToken ? 'Received ✓' : 'Missing ✗'}`);
      console.log(`- Refresh Token: ${refreshToken ? 'Received ✓' : 'Missing ✗'}`);
      
      // Store tokens in user session
      const user = {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.emails && profile.emails[0].value,
        accessToken,
        refreshToken,
        expires_in
      };
      return done(null, user);
    }
  )
);

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  console.log(`Serializing user: ${user.id}`);
  done(null, user);
});

passport.deserializeUser((user, done) => {
  console.log(`Deserializing user: ${user.id}`);
  done(null, user);
});

/**
 * GET /api/spotify/login
 * Initiates Spotify OAuth flow
 */
router.get('/login', (req, res, next) => {
  console.log('Spotify login initiated');
  console.log(`- Session ID: ${req.session?.id || 'No session'}`);
  console.log(`- Redirect URI being used: ${SPOTIFY_REDIRECT_URI}`);
  
  passport.authenticate('spotify')(req, res, next);
});

/**
 * GET /api/spotify/callback
 * Callback endpoint for Spotify OAuth
 */
router.get(
  '/callback',
  (req, res, next) => {
    console.log('Spotify callback received');
    console.log(`- Session ID: ${req.session?.id || 'No session'}`);
    console.log(`- Query params: ${JSON.stringify(req.query)}`);
    
    // Check for error in the callback
    if (req.query.error) {
      console.error(`Spotify auth error: ${req.query.error}`);
      return res.redirect('/?auth_error=' + encodeURIComponent(req.query.error));
    }
    
    next();
  },
  passport.authenticate('spotify', {
    failureRedirect: '/?auth_status=failed'
  }),
  (req, res) => {
    console.log('Spotify authentication completed successfully');
    console.log(`- User ID: ${req.user?.id || 'No user ID'}`);
    console.log(`- Access Token exists: ${!!req.user?.accessToken}`);
    res.redirect('/?auth_status=success');
  }
);

/**
 * GET /api/spotify/user
 * Returns the authenticated user's Spotify profile
 */
router.get('/user', (req, res) => {
  console.log('Spotify user info requested');
  console.log(`- Session ID: ${req.session?.id || 'No session'}`);
  console.log(`- Is authenticated: ${!!req.user}`);
  
  if (!req.user) {
    console.log('User not authenticated with Spotify');
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }
  
  console.log(`- Returning info for user: ${req.user.id}`);
  res.json({
    id: req.user.id,
    displayName: req.user.displayName,
    email: req.user.email
  });
});

/**
 * GET /api/spotify/debug
 * Debugging endpoint to inspect session and request information
 */
router.get('/debug', (req, res) => {
  console.log('Debug endpoint called');
  
  // Inspect headers, cookies, and session
  const headers = req.headers;
  const cookies = req.cookies || {};
  const session = req.session || {};
  
  // Sanitize session data for logging (remove sensitive info)
  const sanitizedSession = { ...session };
  if (sanitizedSession.passport && sanitizedSession.passport.user) {
    if (sanitizedSession.passport.user.accessToken) {
      sanitizedSession.passport.user.accessToken = 'REDACTED';
    }
    if (sanitizedSession.passport.user.refreshToken) {
      sanitizedSession.passport.user.refreshToken = 'REDACTED';
    }
  }
  
  console.log('Session data:', JSON.stringify(sanitizedSession, null, 2));
  console.log('Cookie header:', headers.cookie);
  console.log('Request host:', headers.host);
  console.log('Request protocol:', req.protocol);
  
  res.json({
    auth: {
      isAuthenticated: !!req.user,
      sessionExists: !!req.session,
      sessionID: req.sessionID || null
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      spotifyRedirectUri: SPOTIFY_REDIRECT_URI,
      hasClientId: !!SPOTIFY_CLIENT_ID,
      hasClientSecret: !!SPOTIFY_CLIENT_SECRET
    },
    request: {
      host: req.headers.host,
      protocol: req.protocol,
      originalUrl: req.originalUrl,
      referrer: req.headers.referer || null,
      userAgent: req.headers['user-agent'] || null
    }
  });
});

/**
 * GET /api/spotify/logout
 * Logs out the user from Spotify
 */
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error logging out' });
    }
    res.redirect('/');
  });
});

/**
 * POST /api/spotify/search
 * Searches Spotify for a track
 */
router.post('/search', async (req, res) => {
  try {
    if (!req.user || !req.user.accessToken) {
      return res.status(401).json({ error: 'Not authenticated with Spotify' });
    }

    const { title, artist } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let query = `track:${title}`;
    if (artist) {
      query += ` artist:${artist}`;
    }

    const response = await axios.get('https://api.spotify.com/v1/search', {
      params: {
        q: query,
        type: 'track',
        limit: 5
      },
      headers: {
        Authorization: `Bearer ${req.user.accessToken}`
      }
    });

    const tracks = response.data.tracks.items.map(track => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      image: track.album.images[0]?.url,
      uri: track.uri,
      previewUrl: track.preview_url
    }));

    res.json({ tracks });
  } catch (error) {
    console.error('Spotify search error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error searching Spotify',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

/**
 * POST /api/spotify/like
 * Adds a track to the user's Liked Songs
 */
router.post('/like', async (req, res) => {
  try {
    if (!req.user || !req.user.accessToken) {
      return res.status(401).json({ error: 'Not authenticated with Spotify' });
    }

    const { trackId } = req.body;
    if (!trackId) {
      return res.status(400).json({ error: 'Track ID is required' });
    }

    await axios.put(
      'https://api.spotify.com/v1/me/tracks',
      { ids: [trackId] },
      {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ success: true, message: 'Track added to Liked Songs' });
  } catch (error) {
    console.error('Spotify like error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error adding track to Liked Songs',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

/**
 * GET /api/spotify/playlists
 * Gets the user's playlists
 */
router.get('/playlists', async (req, res) => {
  try {
    if (!req.user || !req.user.accessToken) {
      return res.status(401).json({ error: 'Not authenticated with Spotify' });
    }

    const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
      params: {
        limit: 50
      },
      headers: {
        Authorization: `Bearer ${req.user.accessToken}`
      }
    });

    const playlists = response.data.items.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      image: playlist.images[0]?.url,
      trackCount: playlist.tracks.total,
      isOwner: playlist.owner.id === req.user.id
    }));

    res.json({ playlists });
  } catch (error) {
    console.error('Spotify playlists error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error fetching playlists',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

/**
 * POST /api/spotify/playlist/create
 * Creates a new playlist
 */
router.post('/playlist/create', async (req, res) => {
  try {
    if (!req.user || !req.user.accessToken) {
      return res.status(401).json({ error: 'Not authenticated with Spotify' });
    }

    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    const response = await axios.post(
      `https://api.spotify.com/v1/users/${req.user.id}/playlists`,
      {
        name,
        description: description || `Created by ImageToMusic App`,
        public: true
      },
      {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      playlist: {
        id: response.data.id,
        name: response.data.name,
        image: response.data.images[0]?.url,
        external_url: response.data.external_urls.spotify
      }
    });
  } catch (error) {
    console.error('Spotify create playlist error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error creating playlist',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

/**
 * POST /api/spotify/playlist/add
 * Adds tracks to a playlist
 */
router.post('/playlist/add', async (req, res) => {
  try {
    if (!req.user || !req.user.accessToken) {
      return res.status(401).json({ error: 'Not authenticated with Spotify' });
    }

    const { playlistId, trackIds } = req.body;
    if (!playlistId) {
      return res.status(400).json({ error: 'Playlist ID is required' });
    }
    if (!trackIds || !trackIds.length) {
      return res.status(400).json({ error: 'At least one track ID is required' });
    }

    const trackUris = trackIds.map(id => `spotify:track:${id}`);

    await axios.post(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        uris: trackUris
      },
      {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      message: `Added ${trackIds.length} tracks to playlist`
    });
  } catch (error) {
    console.error('Spotify add to playlist error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error adding tracks to playlist',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

module.exports = router; 