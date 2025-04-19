import axios from 'axios';
import api from '../../service/api';

class SpotifyService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    // Your client credentials should be stored securely (environment variables)
    this.clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET;
    
    // Base URLs
    this.apiBaseUrl = 'https://api.spotify.com/v1';
    this.authUrl = 'https://accounts.spotify.com/api/token';
  }

  // Get access token using client credentials flow
  async getAccessToken() {
    // Return existing token if it's still valid
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    try {
      // Make a request to get a new token
      const response = await axios({
        method: 'post',
        url: this.authUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${this.clientId}:${this.clientSecret}`)
        },
        data: 'grant_type=client_credentials'
      });

      // Set the token and its expiry
      this.token = response.data.access_token;
      this.tokenExpiry = new Date();
      this.tokenExpiry.setSeconds(this.tokenExpiry.getSeconds() + response.data.expires_in);

      return this.token;
    } catch (error) {
      console.error('Error getting Spotify access token:', error);
      throw error;
    }
  }
  // try to get SOTD from backend first
  async GetSotdFromBackend() {
    try {
        const response = await api
    }
  }

  // Get playlist tracks
  async getPlaylistTracks(playlistId) {
    try {
    
        const token = await this.getAccessToken();
      
      const response = await axios.get(`${this.apiBaseUrl}/playlists/${playlistId}/tracks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          limit: 50, // Adjust as needed
          fields: 'items(track(id,name,artists(name),album(name,images)))'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      throw error;
    }
  }

  // Get a random track from a playlist
  async getRandomTrackFromPlaylist(playlistId) {
    try {
      const data = await this.getPlaylistTracks(playlistId);
      
      if (!data.items || data.items.length === 0) {
        throw new Error('No tracks found in playlist');
      }
      
      // Get a random track
      const randomIndex = Math.floor(Math.random() * data.items.length);
      return data.items[randomIndex].track;
    } catch (error) {
      console.error('Error getting random track:', error);
      throw error;
    }
  }
}

export default new SpotifyService();
