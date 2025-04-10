// Add this component to your project (e.g., HeadwayWidget.js)

import React, { useEffect, useRef } from 'react';

const HeadwayWidget = () => {
  // Use a ref to keep track of the widget container
  const notebookRef = useRef(null);
  
  useEffect(() => {
    // Wait until the component is mounted before loading Headway
    if (!notebookRef.current) return;
    
    // Only load the script once
    if (document.getElementById('headway-script')) {
      // If script exists but Headway isn't initialized, initialize it
      if (window.Headway) {
        try {
          window.Headway.init({
            selector: '.notebook-container',
            account: 'JrbMDJ'
          });
        } catch (e) {
          console.error('Error initializing Headway:', e);
        }
      }
      return;
    }
    
    // Create script element
    const script = document.createElement('script');
    script.id = 'headway-script';
    script.src = 'https://cdn.headwayapp.co/widget.js';
    script.async = true;
    
    // Configure Headway before loading the script
    window.HW_config = {
      selector: '.notebook-container',
      account: 'JrbMDJ',
      enabled: true  // Explicitly enable the widget
    };
    
    // Add event listeners
    script.onload = () => {
      console.log('Headway script loaded');
    };
    
    script.onerror = (e) => {
      console.error('Error loading Headway script:', e);
    };
    
    // Append script to document
    document.head.appendChild(script);
    
    // Clean up function
    return () => {
      if (window.Headway) {
        try {
          window.Headway.destroy();
        } catch (e) {
          console.error('Error destroying Headway:', e);
        }
      }
    };
  }, []);
  
  return (
    <div className="notebook-container" ref={notebookRef} style={{backgroundColor: "var(--background-color)"}}>
        
      <svg 
        className="notebook-svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <g id="SVGRepo_iconCarrier">
          <path d="M7 0h16v20H5V0h2zm14 18V2H7v16h14zM9 4h10v2H9V4zm10 4H9v2h10V8zM9 12h7v2H9v-2zm10 10H3V4H1v20h18v-2z" />
        </g>
      </svg>
    </div>
  );
};

export default HeadwayWidget;