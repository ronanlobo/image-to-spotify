#!/bin/bash

# This script runs during Vercel's build process to set up credentials

# Create necessary directories
mkdir -p .vercel

# Check if GOOGLE_CREDENTIALS_BASE64 is set
if [ -n "$GOOGLE_CREDENTIALS_BASE64" ]; then
  echo "Decoding Google Cloud credentials from GOOGLE_CREDENTIALS_BASE64..."
  echo "$GOOGLE_CREDENTIALS_BASE64" | base64 --decode > .vercel/credentials.json
  echo "Credentials saved to .vercel/credentials.json"
elif [ -n "$GOOGLE_CREDENTIALS" ]; then
  echo "Copying Google Cloud credentials from GOOGLE_CREDENTIALS..."
  echo "$GOOGLE_CREDENTIALS" > .vercel/credentials.json
  echo "Credentials saved to .vercel/credentials.json"
else
  echo "Warning: No Google Cloud credentials found in environment variables."
  echo "The application may not be able to use Google Cloud Vision API."
fi

# Make the script executable
chmod +x .vercel/credentials.json

# Continue with normal build process
echo "Build setup complete. Continuing with normal build process..." 