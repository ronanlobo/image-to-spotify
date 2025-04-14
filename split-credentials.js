/**
 * Utility script to split Google Cloud credentials into chunks for Vercel environment variables
 * 
 * Usage:
 * 1. Save your credentials JSON to a file (e.g., credentials.json)
 * 2. Run: node split-credentials.js credentials.json
 * 3. Copy the output to set as environment variables in Vercel
 */

const fs = require('fs');

// Get the file path from command-line arguments
const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a path to your credentials file.');
  console.error('Usage: node split-credentials.js path/to/credentials.json');
  process.exit(1);
}

try {
  // Read and parse the credentials file
  const credentialsRaw = fs.readFileSync(filePath, 'utf8');
  const credentials = JSON.stringify(JSON.parse(credentialsRaw));
  
  // Define chunk size (Vercel has a 4KB limit, so we'll use 3500 to be safe)
  const chunkSize = 3500;
  const chunks = [];
  
  // Split the credentials into chunks
  for (let i = 0; i < credentials.length; i += chunkSize) {
    chunks.push(credentials.substring(i, i + chunkSize));
  }
  
  // Print instructions for setting environment variables
  console.log(`\nYour credentials have been split into ${chunks.length} chunks.\n`);
  console.log('Set the following environment variables in Vercel:\n');
  
  chunks.forEach((chunk, index) => {
    console.log(`GOOGLE_CREDS_${index + 1}="${chunk}"`);
  });
  
  console.log('\nThen update your vision.js file to combine these chunks:\n');
  console.log(`try {
  // Combine credential chunks
  const credentialsJson = ${Array.from({ length: chunks.length }, (_, i) => `process.env.GOOGLE_CREDS_${i + 1} || ''`).join(' + ')};
  
  if (credentialsJson) {
    const parsedCredentials = JSON.parse(credentialsJson);
    visionClient = new ImageAnnotatorClient({
      credentials: parsedCredentials
    });
  } else {
    // Fallback options...
  }
} catch (error) {
  console.error('Failed to initialize Vision client:', error);
}`);

} catch (error) {
  console.error('Error processing credentials file:', error.message);
  process.exit(1);
} 