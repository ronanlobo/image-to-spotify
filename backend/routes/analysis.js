/**
 * Analysis Routes
 * Handles image analysis and song recommendation endpoints
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const visionService = require('../lib/vision');
const openaiService = require('../lib/openai');

// In-memory storage for uploaded images and analysis results
const imageCache = new Map();
const analysisCache = new Map();

// Configure multer for in-memory storage (compatible with serverless)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * POST /api/analysis/upload
 * Uploads an image and returns its unique identifier
 */
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    // Generate a unique ID for the file
    const fileId = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // Store the image buffer in memory cache
    imageCache.set(fileId, req.file.buffer);
    
    res.status(200).json({
      message: 'Image uploaded successfully',
      filename: fileId,
      path: `/api/image/${fileId}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Error uploading image' });
  }
});

/**
 * POST /api/analysis/analyze
 * Analyzes an uploaded image using Google Cloud Vision
 */
router.post('/analyze', async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'No filename provided' });
    }
    
    // Check if we have cached results
    if (analysisCache.has(filename)) {
      console.log('Returning cached analysis for', filename);
      return res.status(200).json(analysisCache.get(filename));
    }

    // Get image buffer from cache
    const imageBuffer = imageCache.get(filename);
    if (!imageBuffer) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Analyze image using Google Cloud Vision
    const analysisResults = await visionService.analyzeImageBuffer(imageBuffer);
    
    // Cache the results
    analysisCache.set(filename, analysisResults);
    
    res.status(200).json(analysisResults);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Error analyzing image', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/analysis/recommend
 * Generates song recommendations based on image analysis keywords
 */
router.post('/recommend', async (req, res) => {
  try {
    const { keywords, colors, emotions } = req.body;
    
    if (!keywords || !keywords.length) {
      return res.status(400).json({ error: 'No keywords provided' });
    }

    // Generate recommendations using OpenAI
    const recommendations = await openaiService.generateRecommendations(
      keywords, 
      colors || [], 
      emotions || []
    );
    
    res.status(200).json(recommendations);
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ 
      error: 'Error generating recommendations', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/image/:id
 * Serves an image from memory cache (for preview purposes)
 */
router.get('/image/:id', (req, res) => {
  const imageId = req.params.id;
  const imageBuffer = imageCache.get(imageId);
  
  if (!imageBuffer) {
    return res.status(404).json({ error: 'Image not found' });
  }
  
  res.set('Content-Type', 'image/jpeg');
  res.send(imageBuffer);
});

// Debug endpoint to check API status
router.get('/status', (req, res) => {
  res.json({
    status: 'OK',
    environment: process.env.NODE_ENV,
    cacheSize: {
      images: imageCache.size,
      analysis: analysisCache.size
    }
  });
});

// Debug endpoint to test Vision API
router.get('/test-vision', async (req, res) => {
  try {
    // Attempt to validate Vision client initialization
    if (!visionService.isInitialized()) {
      return res.status(500).json({
        error: 'Vision API client not properly initialized',
        googleCredentials: process.env.GOOGLE_CREDENTIALS ? 'Provided' : 'Missing'
      });
    }
    
    // Return success if we got here
    res.json({
      status: 'Vision API client initialized successfully',
      googleCredentials: process.env.GOOGLE_CREDENTIALS ? 'Provided' : 'Using Application Default Credentials'
    });
  } catch (error) {
    console.error('Vision test error:', error);
    res.status(500).json({
      error: 'Error testing Vision API',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router; 