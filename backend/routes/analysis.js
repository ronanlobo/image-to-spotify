/**
 * Analysis Routes
 * Handles image analysis and song recommendation endpoints
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const visionService = require('../lib/vision');
const openaiService = require('../lib/openai');

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

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

// Cache to store previous analysis results
const analysisCache = new Map();

/**
 * POST /api/analysis/upload
 * Uploads an image and returns its unique identifier
 */
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    res.status(200).json({
      message: 'Image uploaded successfully',
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`
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

    const imagePath = path.join(uploadsDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    // Check if we have cached results
    if (analysisCache.has(filename)) {
      console.log('Returning cached analysis for', filename);
      return res.status(200).json(analysisCache.get(filename));
    }

    // Analyze image using Google Cloud Vision
    const analysisResults = await visionService.analyzeImage(imagePath);
    
    // Cache the results
    analysisCache.set(filename, analysisResults);
    
    res.status(200).json(analysisResults);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Error analyzing image', details: error.message });
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
    res.status(500).json({ error: 'Error generating recommendations', details: error.message });
  }
});

module.exports = router; 