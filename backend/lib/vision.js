/**
 * Google Cloud Vision Service
 * Analyzes images to extract labels, colors, and emotional content
 */

const { ImageAnnotatorClient } = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');

// Initialize Vision client
let visionClient;

try {
  // Try multiple ways to get credentials
  if (fs.existsSync(path.join(process.cwd(), '.vercel/credentials.json'))) {
    // Load credentials from file system
    console.log('Using Google credentials from .vercel/credentials.json');
    visionClient = new ImageAnnotatorClient({
      keyFilename: path.join(process.cwd(), '.vercel/credentials.json')
    });
  } else if (process.env.GOOGLE_CREDENTIALS) {
    // If using GOOGLE_CREDENTIALS environment variable (fallback)
    console.log('Using Google credentials from environment variable');
    visionClient = new ImageAnnotatorClient({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS)
    });
  } else {
    // Default initialization (for local development with ADC)
    console.log('Using Application Default Credentials');
    visionClient = new ImageAnnotatorClient();
  }
} catch (error) {
  console.error('Failed to initialize Vision client:', error);
}

/**
 * Analyzes an image buffer using Google Cloud Vision API
 * @param {Buffer} imageBuffer - Buffer containing the image data
 * @returns {Object} Analysis results containing labels, colors, and emotions
 */
async function analyzeImageBuffer(imageBuffer) {
  try {
    // Convert buffer to base64
    const encodedImage = imageBuffer.toString('base64');
    
    // Create request for the annotateImage method
    const request = {
      image: {
        content: encodedImage
      },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 15 },
        { type: 'IMAGE_PROPERTIES' },
        { type: 'FACE_DETECTION', maxResults: 5 }
      ]
    };
    
    // Call annotateImage method
    const [result] = await visionClient.annotateImage(request);
    
    // Extract results from the combined response
    const labelAnnotations = result.labelAnnotations || [];
    const imageProperties = result.imagePropertiesAnnotation || {};
    const faceAnnotations = result.faceAnnotations || [];
    
    // Extract top 5 labels with scores
    const labels = labelAnnotations.slice(0, 5).map(label => ({
      description: label.description,
      score: label.score
    }));
    
    // Extract dominant colors
    const colors = imageProperties.dominantColors 
      ? imageProperties.dominantColors.colors.slice(0, 5).map(color => ({
          red: color.color.red,
          green: color.color.green,
          blue: color.color.blue,
          score: color.score,
          pixelFraction: color.pixelFraction,
          hex: rgbToHex(color.color.red, color.color.green, color.color.blue)
        }))
      : [];
    
    // Extract face emotions if any faces detected
    const emotions = faceAnnotations.map(face => ({
      joy: getEmotionLikelihood(face.joyLikelihood),
      sorrow: getEmotionLikelihood(face.sorrowLikelihood),
      anger: getEmotionLikelihood(face.angerLikelihood),
      surprise: getEmotionLikelihood(face.surpriseLikelihood)
    }));
    
    // Get dominant emotion across all faces
    const dominantEmotion = getDominantEmotion(emotions);
    
    // Generate color names based on RGB values
    const colorNames = colors.map(color => getColorName(color));
    
    // Extract keywords from labels and colors for recommendation
    const keywords = extractKeywords(labels, colorNames, dominantEmotion);
    
    return {
      labels,
      colors,
      emotions: emotions.length ? emotions : null,
      dominantEmotion,
      colorNames,
      keywords
    };
  } catch (error) {
    console.error('Vision API error:', error);
    throw new Error(`Vision API analysis failed: ${error.message}`);
  }
}

/**
 * Analyzes an image using Google Cloud Vision API
 * @param {string} imagePath - Path to the image file
 * @returns {Object} Analysis results containing labels, colors, and emotions
 */
async function analyzeImage(imagePath) {
  try {
    // Load image file as base64
    const imageFile = fs.readFileSync(imagePath);
    return analyzeImageBuffer(imageFile);
  } catch (error) {
    console.error('Vision API error:', error);
    throw new Error(`Vision API analysis failed: ${error.message}`);
  }
}

/**
 * Converts RGB values to hex color code
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {string} Hex color code
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    })
    .join('');
}

/**
 * Maps Google Vision likelihood string to numeric score
 * @param {string} likelihood - Google Vision likelihood string
 * @returns {number} Numeric score (0-1)
 */
function getEmotionLikelihood(likelihood) {
  const likelihoodMap = {
    'VERY_UNLIKELY': 0.0,
    'UNLIKELY': 0.25,
    'POSSIBLE': 0.5,
    'LIKELY': 0.75,
    'VERY_LIKELY': 1.0
  };
  return likelihoodMap[likelihood] || 0;
}

/**
 * Gets the dominant emotion from a list of emotion scores
 * @param {Array} emotions - List of emotion objects
 * @returns {string|null} Dominant emotion or null if no faces detected
 */
function getDominantEmotion(emotions) {
  if (!emotions || emotions.length === 0) {
    return null;
  }
  
  // Aggregate emotions across all faces
  const aggregated = emotions.reduce((acc, emotion) => {
    Object.keys(emotion).forEach(key => {
      acc[key] = (acc[key] || 0) + emotion[key];
    });
    return acc;
  }, {});
  
  // Find emotion with highest score
  let dominant = null;
  let highestScore = 0;
  
  Object.keys(aggregated).forEach(emotion => {
    if (aggregated[emotion] > highestScore) {
      highestScore = aggregated[emotion];
      dominant = emotion;
    }
  });
  
  // Only return if score is significant
  return highestScore > 0.5 ? dominant : null;
}

/**
 * Gets approximate color name from RGB values
 * @param {Object} color - RGB color object
 * @returns {string} Color name
 */
function getColorName(color) {
  const { red, green, blue } = color;
  
  // Simple algorithm for basic color naming
  // This could be enhanced with a more sophisticated color naming library
  
  // Check for grayscale first
  if (Math.abs(red - green) < 20 && Math.abs(green - blue) < 20 && Math.abs(red - blue) < 20) {
    if (red < 50) return 'black';
    if (red < 120) return 'dark gray';
    if (red < 200) return 'gray';
    return 'white';
  }
  
  // Check for primary and secondary colors
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  
  // Determine hue
  let hue;
  if (delta === 0) {
    hue = 0;
  } else if (max === red) {
    hue = ((green - blue) / delta) % 6;
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }
  
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;
  
  // Determine saturation
  const saturation = max === 0 ? 0 : delta / max;
  
  // Determine brightness
  const brightness = max / 255;
  
  // Map to color names based on HSB values
  if (saturation < 0.1) {
    return brightness < 0.5 ? 'dark gray' : 'light gray';
  }
  
  if (brightness < 0.2) return 'dark';
  
  if (hue >= 345 || hue < 15) return brightness < 0.5 ? 'dark red' : 'red';
  if (hue >= 15 && hue < 45) return brightness < 0.5 ? 'brown' : 'orange';
  if (hue >= 45 && hue < 75) return brightness < 0.5 ? 'olive' : 'yellow';
  if (hue >= 75 && hue < 165) return brightness < 0.5 ? 'dark green' : 'green';
  if (hue >= 165 && hue < 195) return brightness < 0.5 ? 'teal' : 'cyan';
  if (hue >= 195 && hue < 255) return brightness < 0.5 ? 'navy' : 'blue';
  if (hue >= 255 && hue < 285) return brightness < 0.5 ? 'dark purple' : 'purple';
  if (hue >= 285 && hue < 345) return brightness < 0.5 ? 'dark pink' : 'pink';
  
  return 'unknown';
}

/**
 * Extracts keywords for song recommendations from image analysis
 * @param {Array} labels - Detected labels
 * @param {Array} colorNames - Detected color names
 * @param {string|null} dominantEmotion - Dominant emotion
 * @returns {Array} Keywords for recommendation
 */
function extractKeywords(labels, colorNames, dominantEmotion) {
  // Extract top label descriptions
  const labelKeywords = labels.map(label => label.description);
  
  // Extract dominant colors, limiting to top 2
  const colorKeywords = colorNames.slice(0, 2);
  
  // Map emotion to mood keywords
  let emotionKeywords = [];
  if (dominantEmotion) {
    const emotionMap = {
      'joy': ['happy', 'upbeat', 'cheerful'],
      'sorrow': ['sad', 'melancholic', 'emotional'],
      'anger': ['intense', 'powerful', 'angry'],
      'surprise': ['exciting', 'energetic', 'surprising']
    };
    emotionKeywords = emotionMap[dominantEmotion] || [];
  }
  
  // Combine all keywords and remove duplicates
  const allKeywords = [...labelKeywords, ...colorKeywords, ...emotionKeywords];
  
  // Return unique keywords
  return [...new Set(allKeywords)];
}

/**
 * Checks if the Vision client is properly initialized
 * @returns {boolean} Whether the client is initialized
 */
function isInitialized() {
  return !!visionClient;
}

module.exports = {
  analyzeImage,
  analyzeImageBuffer,
  isInitialized
}; 