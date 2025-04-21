import React, { useState, useEffect, useRef } from 'react';
import SpotifyService from './SpotifyService';
import axios from 'axios';
import Comment from '../comments/Comment';
import { ChatLeft } from 'react-bootstrap-icons';

const SOTD = ({ currentUser }) => {
  const [trackUri, setTrackUri] = useState('');
  const [trackInfo, setTrackInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [embedReady, setEmbedReady] = useState(false);
  const [embedLoading, setEmbedLoading] = useState(false);
  const containerRef = useRef(null);
  const embedControllerRef = useRef(null);
  
  // Admin functionality states
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [songOfTheDayId, setSongOfTheDayId] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  

  const PLAYLIST_ID = '4rziA8pwlBa2Hg61IHpnEz';
  const API_URL = 'https://mljapp.onrender.com/japp';
  
  // Check if current user is admin
  useEffect(() => {
    if (currentUser === 'pbkelly') {
      setIsAdmin(true);
    }
  }, [currentUser]);
  
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
      setEmbedLoading(true);
      setEmbedReady(false);
      const IFrameAPI = await loadSpotifyEmbedApi();

      // Clear previous iframe if it exists
      if (containerRef.current.firstChild) {
        containerRef.current.innerHTML = '';
      }

      // Create a container element for the iframe
      const iframeContainer = document.createElement('div');
      containerRef.current.appendChild(iframeContainer);

      console.log('Initializing embed with URI:', uri);

      // Initialize the embed
      IFrameAPI.createController(iframeContainer, {
        width: '100%',
        height: 352,
        uri: uri,
        theme: 'dark',
      }, (EmbedController) => {
        embedControllerRef.current = EmbedController;
        
        // Add event listeners
        EmbedController.addListener('ready', () => {
          console.log('Embed ready with URI:', uri);
          setEmbedReady(true);
          setEmbedLoading(false);
        });
        
        EmbedController.addListener('load_error', (error) => {
          console.error('Embed load error:', error);
          setError('Failed to load the song');
          setEmbedReady(false);
          setEmbedLoading(false);
        });
      });
    } catch (err) {
      console.error('Failed to initialize Spotify embed:', err);
      setError('Failed to load Spotify player');
      setEmbedReady(false);
      setEmbedLoading(false);
    }
  };

  // Format track URI consistently
  const formatTrackUri = (uriOrId) => {
    if (uriOrId.startsWith('spotify:track:')) {
      return uriOrId;
    }
    // Extract ID from URI if it's in any other format
    const id = uriOrId.split(':').pop();
    return `spotify:track:${id}`;
  };

  // Save a new SOTD to the backend
  const saveSOTDToBackend = async (track) => {
    try {
      // Format the data for the backend
      const sotdData = {
        trackId: parseInt(track.id, 10),
        trackUri: formatTrackUri(track.id),
        trackName: track.name,
        artists: track.artists.map(artist => artist.name),
        album: track.album.name,
        imageUrl: track.album.images[0]?.url,
        playlistSource: PLAYLIST_ID
      };

      // Send to backend
      const response = await axios.post(`${API_URL}/sotd`, sotdData);
      console.log('SOTD saved to backend:', response.data);
      setSongOfTheDayId(response.data.id);
      return response.data;
    } catch (err) {
      console.error('Error saving SOTD to backend:', err);
      throw err;
    }
  };
  
  // Admin function to override SOTD
  const overrideSOTD = async (track) => {
    try {
      console.log('Overriding with track:', track);
      
      // Format the data for the admin override endpoint
      const sotdData = {
        trackId: parseInt(track.id, 10),
        trackUri: formatTrackUri(track.id),
        trackName: track.name,
        artists: track.artists.map(artist => artist.name),
        album: track.album.name,
        imageUrl: track.album.images[0]?.url,
        activeDay: new Date()
      };

      // Send to backend admin endpoint
      const response = await axios.post(`${API_URL}/admin/sotd/overRide`, sotdData);
      console.log('SOTD overridden:', response.data);
      
      // Update display with the new track
      const uri = formatTrackUri(track.id);
      setTrackUri(uri);
      setTrackInfo({
        name: track.name,
        artist: track.artists.map(artist => artist.name).join(', '),
        album: track.album.name,
        image: track.album.images[0]?.url
      });
      
      // Initialize the embed with the track URI
      await initializeEmbed(uri);
      
      // Clear search results and selected track
      setSearchResults([]);
      setSelectedTrack(null);
      setSearchQuery('');
      
      return response.data;
    } catch (err) {
      console.error('Error overriding SOTD:', err);
      setError('Failed to override Song of the Day');
      throw err;
    }
  };
  
  // Admin function to search for tracks
  const searchTracks = async (query) => {
    if (!query.trim()) return;
    
    setSearching(true);
    try {
      const token = await SpotifyService.getAccessToken();
      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          q: query,
          type: 'track',
          limit: 10
        }
      });
      
      setSearchResults(response.data.tracks.items);
    } catch (err) {
      console.error('Error searching tracks:', err);
      setError('Failed to search for tracks');
    } finally {
      setSearching(false);
    }
  };

  // Fetch comment count for the current SOTD
  const fetchCommentCount = async (sotdId) => {
    if (!sotdId) return;
    try {
      const response = await axios.get(`${API_URL}/comments/sotd/${sotdId}`);
      if (response.data && Array.isArray(response.data)) {
        setCommentCount(response.data.length);
      }
    } catch (error) {
      console.error('Error fetching SOTD comment count:', error);
    }
  };

  // Effect to fetch a song on component mount
  useEffect(() => {
    const fetchSongOfTheDay = async () => {
      setLoading(true);
      setError(null);
      setEmbedReady(false);
    
      try {
        // First, try to get the SOTD from the backend
        const backendSOTD = await SpotifyService.GetSotdFromBackend();
        
        // If we got a valid response from the backend, use it
        if (backendSOTD && backendSOTD.trackUri) {
          console.log('Using SOTD from backend:', backendSOTD);
          const uri = formatTrackUri(backendSOTD.trackUri);
          setTrackUri(uri);
          setTrackInfo({
            name: backendSOTD.trackName,
            artist: backendSOTD.artists.join(', '),
            album: backendSOTD.album,
            image: backendSOTD.imageUrl
          });
          setSongOfTheDayId(backendSOTD.id);
          
          // Fetch comment count
          fetchCommentCount(backendSOTD.id);
          
          // Initialize the embed with the track URI
          await initializeEmbed(uri);
        } else {
          // If backend doesn't have an active SOTD, get a new one and save it
          console.log('Getting new SOTD from Spotify API');
          const track = await SpotifyService.getRandomTrackFromPlaylist(PLAYLIST_ID);
          
          // Save the new track to the backend
          const savedTrack = await saveSOTDToBackend(track);
          setSongOfTheDayId(savedTrack.id);
          
          // Fetch comment count for the new SOTD
          fetchCommentCount(savedTrack.id);
          
          // Set the track URI and info for display
          const uri = formatTrackUri(track.id);
          setTrackUri(uri);
          setTrackInfo({
            name: track.name,
            artist: track.artists.map(artist => artist.name).join(', '),
            album: track.album.name,
            image: track.album.images[0]?.url
          });
          
          // Initialize the embed with the track URI
          await initializeEmbed(uri);
        }
      } catch (err) {
        console.error('Error fetching Song of the Day:', err);
        setError('Failed to fetch Song of the Day');
        
        // Use a fallback track if all API calls fail
        const fallbackUri = 'spotify:track:4cOdK2wGLETKBW3PvgPWqT';
        setTrackUri(fallbackUri);
        setTrackInfo({
          name: "Everybody Wants To Rule The World",
          artist: "Tears for Fears",
          album: "Songs From The Big Chair",
          image: "https://i.scdn.co/image/ab67616d00001e02ca41a947c13b78749c4951b1"
        });
        await initializeEmbed(fallbackUri);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSongOfTheDay();
    
    // Cleanup function
    return () => {
      if (embedControllerRef.current) {
        if (typeof embedControllerRef.current.destroy === 'function') {
          embedControllerRef.current.destroy();
        }
        embedControllerRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  // Effect to update comment count when comments are shown/hidden
  useEffect(() => {
    if (!showComments && songOfTheDayId) {
      // Refresh comment count when comments are closed
      fetchCommentCount(songOfTheDayId);
    }
  }, [showComments, songOfTheDayId]);

  // Toggle comments visibility
  const handleToggleComments = () => {
    setShowComments(!showComments);
  };

  // Render the component
  return (
    <div className="sotd-container" style={{ 
      maxWidth: '500px', 
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: 'var(--card-bg, #fff)',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      position: 'relative'
    }}>
      <h2 className="sotd-title" style={{ 
        textAlign: 'center',
        marginBottom: '20px',
        color: 'var(--primary-color, #333)'
      }}>Song of the Day</h2>
      
      {loading && (
        <div className="sotd-loading" style={{ textAlign: 'center', padding: '20px' }}>
          <div className="loading-spinner" style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            border: '3px solid rgba(0,0,0,0.1)',
            borderRadius: '50%',
            borderTopColor: 'var(--primary-color, #007bff)',
            animation: 'spin 1s linear infinite',
            marginRight: '10px'
          }}></div>
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
      
      {trackInfo && !loading && embedReady && (
        <div className="sotd-info" style={{ textAlign: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: '0 0 5px 0' }}>{trackInfo.name}</h3>
          <p style={{ margin: '0', opacity: 0.8 }}>{trackInfo.artist}</p>
          {trackInfo.album && <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', opacity: 0.6 }}>{trackInfo.album}</p>}
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className="spotify-embed-container" 
        style={{ marginTop: '15px', minHeight: '80px' }}
      />
      
      {embedLoading && (
        <div style={{ textAlign: 'center', padding: '10px', opacity: 0.7 }}>
          Loading player...
        </div>
      )}
      
      {songOfTheDayId && !loading && embedReady && (
        <div className="sotd-actions" style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '15px',
          padding: '10px 0',
          borderTop: '1px solid var(--shadow-color, rgba(0,0,0,0.1))'
        }}>
          <button
            onClick={() => setShowComments(true)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              color: 'var(--primary-color)',
              fontWeight: 'bold',
              padding: '8px 12px',
              borderRadius: '8px',
              marginRight: '8px'
            }}
          >
            <ChatLeft style={{ marginRight: '6px', color: '#FF6B6B' }} />
            {commentCount > 0 ? `Comments (${commentCount})` : 'Add Comment'}
          </button>
        </div>
      )}

      {/* Show the Comment component when showComments is true */}
      {showComments && songOfTheDayId && (
        <Comment
          sotdId={songOfTheDayId}
          currentUsername={currentUser}
          isSotd={true}
          onClose={() => setShowComments(false)}
        />
      )}
      
      {/* Admin Section - Only visible to admin user */}
      {isAdmin && (
        <div className="admin-section" style={{
          marginTop: '30px',
          padding: '15px',
          borderTop: '1px solid var(--shadow-color, rgba(0,0,0,0.1))'
        }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Admin Controls</h3>
          
          {/* Search Form */}
          <div className="search-form" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a track..."
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid var(--shadow-color, rgba(0,0,0,0.2))'
                }}
              />
              <button
                onClick={() => searchTracks(searchQuery)}
                disabled={searching || !searchQuery.trim()}
                style={{
                  padding: '10px 15px',
                  backgroundColor: 'var(--primary-color, #4a90e2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  opacity: searching || !searchQuery.trim() ? 0.7 : 1
                }}
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="search-results" style={{
              maxHeight: '300px',
              overflowY: 'auto',
              marginBottom: '20px',
              border: '1px solid var(--shadow-color, rgba(0,0,0,0.1))',
              borderRadius: '5px'
            }}>
              {searchResults.map(track => (
                <div
                  key={track.id}
                  onClick={() => setSelectedTrack(track)}
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid var(--shadow-color, rgba(0,0,0,0.1))',
                    cursor: 'pointer',
                    backgroundColor: selectedTrack?.id === track.id ? 'rgba(var(--primary-color-rgb, 74, 144, 226), 0.1)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {track.album.images[2] && (
                      <img 
                        src={track.album.images[2].url} 
                        alt={track.album.name}
                        style={{ width: '40px', height: '40px' }}
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{track.name}</div>
                      <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
                        {track.artists.map(artist => artist.name).join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Set SOTD Button */}
          {selectedTrack && (
            <button
              onClick={() => overrideSOTD(selectedTrack)}
              style={{
                padding: '10px 15px',
                backgroundColor: 'var(--accent-color, #e74c3c)',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Set as Song of the Day
            </button>
          )}
        </div>
      )}

      {/* Spinner animation style */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SOTD;