# ImageToMusic

A web application that suggests songs based on an image's mood and allows users to save these songs to their Spotify playlists or liked songs.

## Features

- **Image Analysis**: Upload any image and get it analyzed for content, colors, and mood using Google Cloud Vision API
- **Song Recommendations**: Get personalized song recommendations based on the image analysis using OpenAI
- **Spotify Integration**: Connect your Spotify account to add songs to your playlists or liked songs
- **Dynamic Theme**: The UI theme adapts to the dominant color of the uploaded image
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: HTML, CSS, JavaScript with Bootstrap 5
- **APIs**:
  - Google Cloud Vision API for image analysis
  - OpenAI API for song recommendations
  - Spotify Web API for music integration

## Prerequisites

- Node.js (v14 or later)
- Google Cloud Platform account with Vision API enabled
- OpenAI API account and key
- Spotify Developer account with a registered application

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/your-username/image-song.git
   cd image-song
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Google Cloud Vision API
   GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json

   # OpenAI API
   OPENAI_API_KEY=your_openai_api_key

   # Spotify API
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback

   # Session Secret
   SESSION_SECRET=your_random_session_secret
   ```

4. Set up Google Cloud credentials:
   - Create a service account in Google Cloud Console
   - Download the JSON credentials file
   - Set the path to this file in the `GOOGLE_APPLICATION_CREDENTIALS` environment variable

5. Set up Spotify Developer credentials:
   - Create an application in [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Add `http://localhost:3000/api/spotify/callback` as a Redirect URI
   - Copy the Client ID and Client Secret to the `.env` file

6. Start the server:
   ```
   npm start
   ```

7. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Upload an image using the drag-and-drop interface
2. Click "Analyze Image" to process the image
3. View the extracted keywords and color palette
4. Browse the song recommendations based on the image
5. Connect to Spotify to add songs to your library
6. Create new playlists or add songs to existing ones

## Project Structure

```
image-song/
├── backend/
│   ├── index.js             # Main Express server
│   ├── routes/
│   │   ├── analysis.js      # Image analysis and recommendation routes
│   │   └── spotify.js       # Spotify authentication and API routes
│   └── lib/
│       ├── vision.js        # Google Cloud Vision service
│       └── openai.js        # OpenAI service
├── frontend/
│   ├── index.html           # Main HTML file
│   ├── css/
│   │   └── style.css        # Custom styles
│   └── js/
│       ├── api.js           # Frontend API service
│       └── app.js           # Main application logic
├── uploads/                 # Uploaded images directory
├── package.json             # Project dependencies
└── .env                     # Environment variables
```

## License

MIT License

## Acknowledgements

- [Google Cloud Vision API](https://cloud.google.com/vision)
- [OpenAI API](https://openai.com/api/)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Bootstrap](https://getbootstrap.com/)
- [Font Awesome](https://fontawesome.com/) 
