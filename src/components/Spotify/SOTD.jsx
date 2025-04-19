import React, { useState, useEffect, useRef } from 'react';
import SpotifyService from './SpotifyService';

const SOTD = () => {
  const [trackUri, setTrackUri] = useState('');
  const [trackInfo, setTrackInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const embedControllerRef = useRef(null);

  // Hot Hits USA playlist ID for testing
  const PLAYLIST_ID = '36jMjt77enSYMSr4uoYe9J';
  
  // Load Spotify Embed API
  const loadSpotifyEmbedApi = () => {
    return new Promise((resolve) => {
      if (window.SpotifyIframeApi) {
        resolve(window.SpotifyIframeApi);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://open.spotify.com/embed/iframe-api/v1';
      script.async = true;

      script.onload = () => {
        window.onSpotifyIframeApiReady = (IFrameAPI) => {
          window.SpotifyIframeApi = IFrameAPI;
          resolve(IFrameAPI);
        };
      };

      document.body.appendChild(script);
    });
  };

  // Initialize the Spotify embed
  const initializeEmbed = async (uri) => {
    if (!containerRef.current || !uri) return;

    try {
      const IFrameAPI = await loadSpotifyEmbedApi();

      // Clear previous iframe if it exists
      if (containerRef.current.firstChild) {
        containerRef.current.innerHTML = '';
      }

      // Create a container element for the iframe
      const iframeContainer = document.createElement('div');
      containerRef.current.appendChild(iframeContainer);

      // Initialize the embed
      IFrameAPI.createController(iframeContainer, {
        width: '100%',
        height: 352,
        uri: uri,
        theme: 'dark',
      }, (EmbedController) => {
        embedControllerRef.current = EmbedController;
      });
    } catch (err) {
      console.error('Failed to initialize Spotify embed:', err);
      setError('Failed to load Spotify player');
    }
  };

  // Effect to fetch a random track on component mount
  useEffect(() => {
    const fetchSongOfTheDay = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get a random track from the playlist using our service
        const track = await SpotifyService.getRandomTrackFromPlaylist(PLAYLIST_ID);
        
        // Set the track URI and info
        const uri = `spotify:track:${track.id}`;
        setTrackUri(uri);
        setTrackInfo({
          name: track.name,
          artist: track.artists.map(artist => artist.name).join(', '),
          album: track.album.name,
          image: track.album.images[0]?.url
        });
        
        // Initialize the embed with the track URI
        await initializeEmbed(uri);
      } catch (err) {
        console.error('Error fetching Song of the Day:', err);
        setError('Failed to fetch Song of the Day');
        
        // For demo purposes, use a fallback track if the API call fails
        const fallbackUri = 'spotify:track:4cOdK2wGLETKBW3PvgPWqT';
        setTrackUri(fallbackUri);
        await initializeEmbed(fallbackUri);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSongOfTheDay();
    
    // Cleanup function
    return () => {
      if (embedControllerRef.current) {
        embedControllerRef.current.cleanup();
      }
    };
  }, []);

  // Render the component
  return (
    <div className="sotd-container" style={{ 
      maxWidth: '500px', 
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: 'var(--card-bg, #fff)',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <h2 className="sotd-title" style={{ 
        textAlign: 'center',
        marginBottom: '20px',
        color: 'var(--primary-color, #333)'
      }}>Song of the Day</h2>
      
      {loading && (
        <div className="sotd-loading" style={{ textAlign: 'center', padding: '20px' }}>
          Loading song...
        </div>
      )}
      
      {error && (
        <div className="sotd-error" style={{ 
          textAlign: 'center', 
          padding: '15px',
          backgroundColor: 'rgba(255,0,0,0.1)',
          color: '#d32f2f',
          borderRadius: '5px',
          marginBottom: '15px'
        }}>
          {error}
        </div>
      )}
      
      {trackInfo && !loading && (
        <div className="sotd-info" style={{ textAlign: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: '0 0 5px 0' }}>{trackInfo.name}</h3>
          <p style={{ margin: '0', opacity: 0.8 }}>{trackInfo.artist}</p>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className="spotify-embed-container" 
        style={{ marginTop: '15px', minHeight: '80px' }}
      />
    </div>
  );
};

export default SOTD;
