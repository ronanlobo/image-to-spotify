/**
 * API Service
 * Handles all API requests to the backend
 */

class ApiService {
  /**
   * Upload an image to the server
   * @param {File} imageFile - The image file to upload
   * @returns {Promise<Object>} Upload response with filename
   */
  static async uploadImage(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    try {
      const response = await fetch('/api/analysis/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }
  
  /**
   * Analyze an uploaded image
   * @param {string} filename - The uploaded image filename
   * @returns {Promise<Object>} Analysis results
   */
  static async analyzeImage(filename) {
    try {
      const response = await fetch('/api/analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze image');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    }
  }
  
  /**
   * Get song recommendations based on image analysis
   * @param {Array} keywords - Keywords from image analysis
   * @param {Array} colors - Color names from image analysis
   * @param {string} dominantEmotion - Dominant emotion detected
   * @returns {Promise<Array>} Song recommendations
   */
  static async getRecommendations(keywords, colors, dominantEmotion) {
    try {
      const response = await fetch('/api/analysis/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          keywords, 
          colors, 
          emotions: dominantEmotion ? [dominantEmotion] : [] 
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get recommendations');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Recommendation error:', error);
      throw error;
    }
  }
  
  /**
   * Check if user is authenticated with Spotify
   * @returns {Promise<Object>} User profile or null
   */
  static async getSpotifyUser() {
    try {
      const response = await fetch('/api/spotify/user');
      
      if (!response.ok) {
        // Not authenticated - this is expected in some cases
        if (response.status === 401) {
          return null;
        }
        
        const error = await response.json();
        throw new Error(error.error || 'Failed to get user profile');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Spotify user error:', error);
      return null;
    }
  }
  
  /**
   * Search for a track on Spotify
   * @param {string} title - Track title
   * @param {string} artist - Track artist
   * @returns {Promise<Object>} Search results
   */
  static async searchSpotifyTrack(title, artist) {
    try {
      const response = await fetch('/api/spotify/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, artist })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search Spotify');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Spotify search error:', error);
      throw error;
    }
  }
  
  /**
   * Add a track to user's Spotify Liked Songs
   * @param {string} trackId - Spotify track ID
   * @returns {Promise<Object>} Response data
   */
  static async addToLikedSongs(trackId) {
    try {
      const response = await fetch('/api/spotify/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trackId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add to Liked Songs');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Spotify like error:', error);
      throw error;
    }
  }
  
  /**
   * Get user's Spotify playlists
   * @returns {Promise<Object>} Playlists data
   */
  static async getPlaylists() {
    try {
      const response = await fetch('/api/spotify/playlists');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get playlists');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Spotify playlists error:', error);
      throw error;
    }
  }
  
  /**
   * Create a new Spotify playlist
   * @param {string} name - Playlist name
   * @param {string} description - Playlist description
   * @returns {Promise<Object>} Created playlist data
   */
  static async createPlaylist(name, description) {
    try {
      const response = await fetch('/api/spotify/playlist/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create playlist');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Spotify create playlist error:', error);
      throw error;
    }
  }
  
  /**
   * Add tracks to a Spotify playlist
   * @param {string} playlistId - Spotify playlist ID
   * @param {Array<string>} trackIds - Array of Spotify track IDs
   * @returns {Promise<Object>} Response data
   */
  static async addToPlaylist(playlistId, trackIds) {
    try {
      const response = await fetch('/api/spotify/playlist/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ playlistId, trackIds })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add to playlist');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Spotify add to playlist error:', error);
      throw error;
    }
  }
} 