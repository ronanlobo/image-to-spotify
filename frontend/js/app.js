/**
 * ImageToMusic Application
 * Main JavaScript code for the frontend
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const uploadZone = document.getElementById('upload-zone');
  const imageInput = document.getElementById('image-input');
  const imagePreview = document.getElementById('image-preview');
  const previewContainer = document.getElementById('preview-container');
  const removeImageBtn = document.getElementById('remove-image');
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultsSection = document.getElementById('results-section');
  const keywordsContainer = document.getElementById('keywords-container');
  const keywordsLoading = document.getElementById('keywords-loading');
  const colorsContainer = document.getElementById('colors-container');
  const recommendationsContainer = document.getElementById('recommendations-container');
  const recommendationsLoading = document.getElementById('recommendations-loading');
  const spotifyLoginContainer = document.getElementById('spotify-login-container');
  const spotifyPrompt = document.getElementById('spotify-prompt');
  const spotifyActions = document.getElementById('spotify-actions');
  const createPlaylistBtn = document.getElementById('create-playlist-btn');
  const showPlaylistsBtn = document.getElementById('show-playlists-btn');
  const playlistForm = document.getElementById('playlist-form');
  const playlistsDropdown = document.getElementById('playlists-dropdown');
  const playlistSelect = document.getElementById('playlist-select');
  const createPlaylistSubmit = document.getElementById('create-playlist-submit');
  const addToPlaylistSubmit = document.getElementById('add-to-playlist-submit');
  const spotifyTrackModal = new bootstrap.Modal(document.getElementById('spotify-track-modal'));
  const spotifySearchResults = document.getElementById('spotify-search-results');
  const spotifySearchLoading = document.getElementById('spotify-search-loading');
  const toastContainer = document.querySelector('.toast-container');
  
  // State
  let currentImage = null;
  let uploadedFilename = null;
  let analysisResults = null;
  let recommendations = null;
  let spotifyUser = null;
  let selectedSpotifyTracks = {};
  
  // Initialize Application
  init();
  
  /**
   * Initialize the application
   */
  async function init() {
    // Check Spotify login status
    await checkSpotifyLogin();
    
    // Setup event listeners
    setupEventListeners();
  }
  
  /**
   * Setup all event listeners
   */
  function setupEventListeners() {
    // Upload zone click
    uploadZone.addEventListener('click', () => {
      imageInput.click();
    });
    
    // File input change
    imageInput.addEventListener('change', handleFileSelection);
    
    // Drag and drop functionality
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });
    
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });
    
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      
      if (e.dataTransfer.files.length) {
        handleFileSelection({ target: { files: e.dataTransfer.files } });
      }
    });
    
    // Remove image button
    removeImageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetImageUpload();
    });
    
    // Analyze button
    analyzeBtn.addEventListener('click', analyzeImage);
    
    // Spotify playlist buttons
    createPlaylistBtn.addEventListener('click', () => {
      playlistForm.classList.remove('d-none');
      playlistsDropdown.classList.add('d-none');
    });
    
    showPlaylistsBtn.addEventListener('click', async () => {
      playlistForm.classList.add('d-none');
      playlistsDropdown.classList.remove('d-none');
      
      // Load playlists
      await loadPlaylists();
    });
    
    // Playlist form submission
    createPlaylistSubmit.addEventListener('click', createAndAddToPlaylist);
    
    // Add to existing playlist
    addToPlaylistSubmit.addEventListener('click', addToExistingPlaylist);
  }
  
  /**
   * Handle file selection from input or drop
   * @param {Event} e - Change event from file input
   */
  function handleFileSelection(e) {
    const file = e.target.files[0];
    
    if (file && file.type.startsWith('image/')) {
      currentImage = file;
      
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.src = e.target.result;
        previewContainer.classList.remove('d-none');
        uploadZone.querySelector('.upload-prompt').classList.add('d-none');
      };
      reader.readAsDataURL(file);
      
      // Enable analyze button
      analyzeBtn.disabled = false;
    } else if (file) {
      showToast('Please select an image file', 'error');
    }
  }
  
  /**
   * Reset the image upload to initial state
   */
  function resetImageUpload() {
    currentImage = null;
    uploadedFilename = null;
    imageInput.value = '';
    previewContainer.classList.add('d-none');
    uploadZone.querySelector('.upload-prompt').classList.remove('d-none');
    analyzeBtn.disabled = true;
    resultsSection.classList.add('d-none');
  }
  
  /**
   * Analyze the uploaded image
   */
  async function analyzeImage() {
    if (!currentImage) return;
    
    try {
      // Show results section and loading indicators
      resultsSection.classList.remove('d-none');
      keywordsContainer.innerHTML = '';
      keywordsLoading.classList.remove('d-none');
      colorsContainer.innerHTML = '';
      recommendationsContainer.innerHTML = '';
      recommendationsLoading.classList.remove('d-none');
      
      // Scroll to results
      resultsSection.scrollIntoView({ behavior: 'smooth' });
      
      // Upload the image
      const uploadResponse = await ApiService.uploadImage(currentImage);
      uploadedFilename = uploadResponse.filename;
      
      // Analyze the image
      analysisResults = await ApiService.analyzeImage(uploadedFilename);
      
      // Update UI with analysis results
      updateAnalysisUI(analysisResults);
      
      // Get recommendations
      recommendations = await ApiService.getRecommendations(
        analysisResults.keywords,
        analysisResults.colorNames,
        analysisResults.dominantEmotion
      );
      
      // Update recommendations UI
      updateRecommendationsUI(recommendations);
      
      // Update theme colors based on dominant color
      if (analysisResults.colors && analysisResults.colors.length) {
        updateThemeColors(analysisResults.colors[0].hex);
      }
      
    } catch (error) {
      showToast(error.message, 'error');
      console.error('Analysis error:', error);
      
      // Hide loading indicators
      keywordsLoading.classList.add('d-none');
      recommendationsLoading.classList.add('d-none');
    }
  }
  
  /**
   * Update the UI with image analysis results
   * @param {Object} results - Analysis results from API
   */
  function updateAnalysisUI(results) {
    // Hide loading indicator
    keywordsLoading.classList.add('d-none');
    
    // Display keywords
    keywordsContainer.innerHTML = '';
    results.keywords.forEach(keyword => {
      const tag = document.createElement('div');
      tag.className = 'keyword-tag';
      tag.innerHTML = `<i class="fas fa-tag"></i>${keyword}`;
      keywordsContainer.appendChild(tag);
    });
    
    // Display colors
    colorsContainer.innerHTML = '';
    results.colors.forEach((color, index) => {
      const colorDiv = document.createElement('div');
      colorDiv.className = 'd-flex flex-column align-items-center';
      
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = color.hex;
      
      const label = document.createElement('div');
      label.className = 'color-label';
      label.textContent = results.colorNames[index] || color.hex;
      
      colorDiv.appendChild(swatch);
      colorDiv.appendChild(label);
      colorsContainer.appendChild(colorDiv);
    });
  }
  
  /**
   * Update the UI with song recommendations
   * @param {Array} recommendations - Song recommendations from API
   */
  function updateRecommendationsUI(recommendations) {
    // Hide loading indicator
    recommendationsLoading.classList.add('d-none');
    
    // Reset selected tracks
    selectedSpotifyTracks = {};
    
    // Display recommendations
    recommendationsContainer.innerHTML = '';
    
    if (!recommendations || recommendations.length === 0) {
      recommendationsContainer.innerHTML = `
        <div class="col-12 text-center">
          <p class="text-muted">No recommendations found. Try uploading a different image.</p>
        </div>
      `;
      return;
    }
    
    recommendations.forEach((song, index) => {
      const songCard = document.createElement('div');
      songCard.className = 'col';
      songCard.innerHTML = `
        <div class="card song-card h-100">
          <div class="card-body">
            <div class="song-title">${song.title}</div>
            <div class="song-artist">${song.artist}</div>
            <div class="song-mood">
              <span class="badge bg-light text-dark">
                <i class="fas fa-music me-1"></i>${song.mood}
              </span>
            </div>
            <div class="song-reason">${song.reason}</div>
            <div class="song-actions">
              <button class="btn btn-sm btn-outline-primary spotify-search-btn" data-index="${index}">
                <i class="fab fa-spotify me-1"></i>Find on Spotify
              </button>
              <button class="btn btn-sm btn-outline-success spotify-like-btn d-none" data-track-id="">
                <i class="fas fa-heart me-1"></i>Like
              </button>
            </div>
          </div>
        </div>
      `;
      
      recommendationsContainer.appendChild(songCard);
      
      // Add event listener to Spotify search button
      const searchBtn = songCard.querySelector('.spotify-search-btn');
      searchBtn.addEventListener('click', () => {
        openSpotifySearch(song.title, song.artist, index);
      });
    });
    
    // Show Spotify login prompt or actions
    if (spotifyUser) {
      spotifyPrompt.classList.add('d-none');
      spotifyActions.classList.remove('d-none');
    } else {
      spotifyPrompt.classList.remove('d-none');
      spotifyActions.classList.add('d-none');
    }
  }
  
  /**
   * Check if user is logged in to Spotify
   */
  async function checkSpotifyLogin() {
    try {
      spotifyUser = await ApiService.getSpotifyUser();
      
      // Update UI based on login status
      updateSpotifyLoginUI();
    } catch (error) {
      console.error('Error checking Spotify login:', error);
      spotifyUser = null;
      updateSpotifyLoginUI();
    }
  }
  
  /**
   * Update the UI based on Spotify login status
   */
  function updateSpotifyLoginUI() {
    if (spotifyUser) {
      // User is logged in
      spotifyLoginContainer.innerHTML = `
        <a class="nav-link" href="/api/spotify/logout">
          <i class="fab fa-spotify me-1"></i>Logout (${spotifyUser.displayName})
        </a>
      `;
      
      // If recommendations are showing, update UI
      if (recommendationsContainer.children.length > 0) {
        spotifyPrompt.classList.add('d-none');
        spotifyActions.classList.remove('d-none');
      }
    } else {
      // User is not logged in
      spotifyLoginContainer.innerHTML = `
        <a class="nav-link" href="/api/spotify/login">
          <i class="fab fa-spotify me-1"></i>Connect to Spotify
        </a>
      `;
      
      // If recommendations are showing, update UI
      if (recommendationsContainer.children.length > 0) {
        spotifyPrompt.classList.remove('d-none');
        spotifyActions.classList.add('d-none');
      }
    }
  }
  
  /**
   * Open the Spotify track search modal
   * @param {string} title - Song title
   * @param {string} artist - Song artist
   * @param {number} index - Index of the song in recommendations array
   */
  async function openSpotifySearch(title, artist, index) {
    if (!spotifyUser) {
      // Redirect to Spotify login if not logged in
      window.location.href = '/api/spotify/login';
      return;
    }
    
    try {
      // Show modal and loading indicator
      spotifyTrackModal.show();
      spotifySearchResults.innerHTML = '';
      spotifySearchLoading.classList.remove('d-none');
      
      // Search for the track
      const searchResponse = await ApiService.searchSpotifyTrack(title, artist);
      
      // Hide loading indicator
      spotifySearchLoading.classList.add('d-none');
      
      // Display search results
      if (searchResponse.tracks && searchResponse.tracks.length > 0) {
        spotifySearchResults.innerHTML = '';
        
        searchResponse.tracks.forEach(track => {
          const trackElement = document.createElement('div');
          trackElement.className = 'spotify-track';
          trackElement.innerHTML = `
            <img class="spotify-track-image" src="${track.image || 'https://via.placeholder.com/50'}" alt="${track.name}">
            <div class="spotify-track-info">
              <div class="spotify-track-title">${track.name}</div>
              <div class="spotify-track-artist">${track.artists}</div>
            </div>
            <button class="btn btn-sm btn-success select-track-btn" data-track-id="${track.id}">
              <i class="fas fa-check"></i>
            </button>
          `;
          
          spotifySearchResults.appendChild(trackElement);
          
          // Add event listener to select button
          const selectBtn = trackElement.querySelector('.select-track-btn');
          selectBtn.addEventListener('click', () => {
            selectSpotifyTrack(track.id, index);
            spotifyTrackModal.hide();
          });
        });
      } else {
        spotifySearchResults.innerHTML = `
          <div class="alert alert-warning">
            No tracks found for "${title}" by ${artist}. Try another search.
          </div>
        `;
      }
    } catch (error) {
      spotifySearchLoading.classList.add('d-none');
      spotifySearchResults.innerHTML = `
        <div class="alert alert-danger">
          ${error.message}
        </div>
      `;
    }
  }
  
  /**
   * Select a Spotify track for a recommendation
   * @param {string} trackId - Spotify track ID
   * @param {number} index - Index of the song in recommendations array
   */
  function selectSpotifyTrack(trackId, index) {
    // Store the selected track
    selectedSpotifyTracks[index] = trackId;
    
    // Update the UI
    const songCard = recommendationsContainer.children[index];
    if (songCard) {
      const searchBtn = songCard.querySelector('.spotify-search-btn');
      const likeBtn = songCard.querySelector('.spotify-like-btn');
      
      // Update buttons
      searchBtn.textContent = 'Change Track';
      searchBtn.classList.remove('btn-outline-primary');
      searchBtn.classList.add('btn-primary');
      
      likeBtn.dataset.trackId = trackId;
      likeBtn.classList.remove('d-none');
      
      // Add event listener to like button
      likeBtn.addEventListener('click', async () => {
        try {
          await ApiService.addToLikedSongs(trackId);
          showToast('Song added to your Liked Songs!', 'success');
          
          // Update button
          likeBtn.disabled = true;
          likeBtn.innerHTML = '<i class="fas fa-check me-1"></i>Added';
        } catch (error) {
          showToast(error.message, 'error');
        }
      });
    }
    
    showToast('Track selected! You can now add it to a playlist.', 'success');
  }
  
  /**
   * Load the user's Spotify playlists
   */
  async function loadPlaylists() {
    try {
      // Clear and show loading
      playlistSelect.innerHTML = '<option selected disabled>Loading playlists...</option>';
      
      // Get playlists
      const response = await ApiService.getPlaylists();
      
      // Populate dropdown
      playlistSelect.innerHTML = '<option selected disabled>Select a playlist</option>';
      
      if (response.playlists && response.playlists.length > 0) {
        // Only show playlists the user can modify
        const modifiablePlaylists = response.playlists.filter(p => p.isOwner);
        
        modifiablePlaylists.forEach(playlist => {
          const option = document.createElement('option');
          option.value = playlist.id;
          option.textContent = `${playlist.name} (${playlist.trackCount} tracks)`;
          playlistSelect.appendChild(option);
        });
      } else {
        playlistSelect.innerHTML = '<option selected disabled>No playlists found</option>';
      }
    } catch (error) {
      playlistSelect.innerHTML = '<option selected disabled>Error loading playlists</option>';
      showToast(error.message, 'error');
    }
  }
  
  /**
   * Create a new playlist and add selected tracks
   */
  async function createAndAddToPlaylist() {
    const name = document.getElementById('playlist-name').value.trim();
    const description = document.getElementById('playlist-description').value.trim();
    
    if (!name) {
      showToast('Please enter a playlist name', 'error');
      return;
    }
    
    // Get selected track IDs
    const trackIds = Object.values(selectedSpotifyTracks);
    
    if (trackIds.length === 0) {
      showToast('Please select at least one track from the recommendations', 'error');
      return;
    }
    
    try {
      // Disable button and show loading
      createPlaylistSubmit.disabled = true;
      createPlaylistSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
      
      // Create playlist
      const createResponse = await ApiService.createPlaylist(name, description);
      
      // Add tracks to playlist
      await ApiService.addToPlaylist(createResponse.playlist.id, trackIds);
      
      // Show success and reset
      showToast(`Playlist "${name}" created and ${trackIds.length} songs added!`, 'success');
      document.getElementById('playlist-name').value = '';
      document.getElementById('playlist-description').value = '';
      playlistForm.classList.add('d-none');
      
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      // Reset button
      createPlaylistSubmit.disabled = false;
      createPlaylistSubmit.innerHTML = 'Create and Add Songs';
    }
  }
  
  /**
   * Add selected tracks to an existing playlist
   */
  async function addToExistingPlaylist() {
    const playlistId = playlistSelect.value;
    
    if (!playlistId) {
      showToast('Please select a playlist', 'error');
      return;
    }
    
    // Get selected track IDs
    const trackIds = Object.values(selectedSpotifyTracks);
    
    if (trackIds.length === 0) {
      showToast('Please select at least one track from the recommendations', 'error');
      return;
    }
    
    try {
      // Disable button and show loading
      addToPlaylistSubmit.disabled = true;
      addToPlaylistSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
      
      // Add tracks to playlist
      await ApiService.addToPlaylist(playlistId, trackIds);
      
      // Show success and reset
      showToast(`${trackIds.length} songs added to the playlist!`, 'success');
      playlistsDropdown.classList.add('d-none');
      
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      // Reset button
      addToPlaylistSubmit.disabled = false;
      addToPlaylistSubmit.innerHTML = 'Add Songs to Playlist';
    }
  }
  
  /**
   * Update theme colors based on the dominant color from the image
   * @param {string} hexColor - Hex color code
   */
  function updateThemeColors(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substring(1, 3), 16);
    const g = parseInt(hexColor.substring(3, 5), 16);
    const b = parseInt(hexColor.substring(5, 7), 16);
    
    // Calculate brightness (higher values = lighter colors)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Determine if text should be dark or light
    const textColor = brightness > 128 ? '#212529' : '#ffffff';
    
    // Create a slightly darker version for hover states
    const darkerHex = darkenColor(hexColor, 20);
    
    // Update primary color variables
    document.documentElement.style.setProperty('--primary-color', hexColor);
    document.documentElement.style.setProperty('--bs-primary', hexColor);
    document.documentElement.style.setProperty('--bs-primary-rgb', `${r}, ${g}, ${b}`);
    
    // Update navbar
    const navbar = document.querySelector('.navbar');
    navbar.style.backgroundColor = hexColor;
    navbar.style.color = textColor;
    
    // Add transition class to relevant elements
    document.querySelectorAll('.btn-primary, .bg-primary, .navbar').forEach(el => {
      el.classList.add('theme-transition');
    });
  }
  
  /**
   * Darken a hex color by a specified amount
   * @param {string} hex - Hex color code
   * @param {number} amount - Amount to darken (0-255)
   * @returns {string} Darkened hex color
   */
  function darkenColor(hex, amount) {
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);
    
    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  /**
   * Show a toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, warning, info)
   */
  function showToast(message, type = 'info') {
    const typeClasses = {
      success: 'bg-success',
      error: 'bg-danger',
      warning: 'bg-warning',
      info: 'bg-info'
    };
    
    const typeIcons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${typeClasses[type] || 'bg-info'} text-white`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    toastEl.innerHTML = `
      <div class="toast-header ${typeClasses[type] || 'bg-info'} text-white">
        <i class="${typeIcons[type] || 'fas fa-info-circle'} me-2"></i>
        <strong class="me-auto">ImageToMusic</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    `;
    
    toastContainer.appendChild(toastEl);
    
    const toast = new bootstrap.Toast(toastEl, {
      autohide: true,
      delay: 5000
    });
    
    toast.show();
    
    // Remove from DOM after hiding
    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  }
}); 