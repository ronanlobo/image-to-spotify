/**
 * OpenAI Service
 * Generates song recommendations based on image analysis results
 */

const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Cache to store recommendation results
const recommendationCache = new Map();

/**
 * Generates song recommendations based on image analysis keywords
 * @param {Array} keywords - Array of keywords from image analysis
 * @param {Array} colors - Array of color names
 * @param {Array} emotions - Array of emotion data
 * @returns {Array} Array of song recommendations
 */
async function generateRecommendations(keywords, colors = [], emotions = []) {
  try {
    // Create a cache key from the inputs
    const cacheKey = JSON.stringify({ keywords, colors, emotions });
    
    // Check if we have cached recommendations
    if (recommendationCache.has(cacheKey)) {
      console.log('Returning cached recommendations');
      return recommendationCache.get(cacheKey);
    }
    
    // Construct the prompt for OpenAI
    const prompt = constructPrompt(keywords, colors, emotions);
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a music recommendation system that suggests songs based on keywords, colors, and emotions. Return ONLY a valid JSON array with no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: 'json_object' }
    });

    // Parse the response
    const responseText = response.choices[0].message.content;
    const recommendations = parseResponse(responseText);
    
    // Cache the results
    recommendationCache.set(cacheKey, recommendations);
    
    return recommendations;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI recommendation failed: ${error.message}`);
  }
}

/**
 * Constructs a prompt for OpenAI based on image analysis
 * @param {Array} keywords - Array of keywords from image analysis
 * @param {Array} colors - Array of color names
 * @param {Array} emotions - Array of emotion data
 * @returns {string} Constructed prompt
 */
function constructPrompt(keywords, colors = [], emotions = []) {
  // Extract relevant information for the prompt
  const keywordsList = keywords.join(', ');
  const colorsList = colors.join(', ');
  
  // Map emotions to mood descriptions
  let moodDescription = '';
  if (emotions && emotions.length > 0) {
    const emotionMappings = {
      joy: 'happy and uplifting',
      sorrow: 'sad and melancholic',
      anger: 'intense and powerful',
      surprise: 'energetic and exciting'
    };
    
    const dominantEmotion = Object.keys(emotions[0]).reduce((a, b) => 
      emotions[0][a] > emotions[0][b] ? a : b
    );
    
    moodDescription = emotionMappings[dominantEmotion] || '';
  }
  
  // Build the prompt
  let prompt = `Convert these keywords [${keywordsList}]`;
  
  if (colorsList) {
    prompt += ` and colors [${colorsList}]`;
  }
  
  if (moodDescription) {
    prompt += ` with a ${moodDescription} mood`;
  }
  
  prompt += ` into 10 song recommendations. Return only a JSON object with a "recommendations" field containing an array of objects with these fields: "title", "artist", "mood", and "reason".`;
  
  return prompt;
}

/**
 * Parses the OpenAI response and extracts recommendations
 * @param {string} responseText - Raw response from OpenAI
 * @returns {Array} Parsed recommendations
 */
function parseResponse(responseText) {
  try {
    // Parse the JSON response
    const parsedResponse = JSON.parse(responseText);
    
    // Extract the recommendations array
    const recommendations = parsedResponse.recommendations || [];
    
    // Validate and clean each recommendation
    return recommendations.map(rec => ({
      title: rec.title || 'Unknown Title',
      artist: rec.artist || 'Unknown Artist',
      mood: rec.mood || 'Unknown Mood',
      reason: rec.reason || 'Based on image analysis'
    }));
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    return [];
  }
}

module.exports = {
  generateRecommendations
}; 