import React from 'react';

const ThemeSwitcher = ({ currentTheme, setCurrentTheme }) => {
  const themes = [
    { name: 'light', icon: '☀️', bgColor: 'bg-white', textColor: 'text-gray-800' },
    { name: 'blood', icon: '❤️', bgColor: 'bg-gray-800', textColor: 'text-white' },
    { name: 'pink', icon: '🌸', bgColor: 'bg-pink-200', textColor: 'text-pink-800' },
    { name: 'modern', icon: '💎', bgColor: 'bg-indigo-800', textColor: 'text-white' },
    { name: 'beige', icon: '🍂', bgColor: 'bg-amber-100', textColor: 'text-amber-800' },
  ];

  return (
    <div className="theme-switcher">
      {themes.map((theme) => (
        <button
          key={theme.name}
          onClick={() => setCurrentTheme(theme.name)}
          className={`theme-btn ${currentTheme === theme.name ? 'active' : ''}`}
          style={{
            backgroundColor: currentTheme === theme.name ? 'var(--primary-color)' : 'white',
            color: currentTheme === theme.name ? 'white' : 'var(--primary-color)',
            border: '2px solid var(--primary-color)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            margin: '0 5px',
            cursor: 'pointer',
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '20px',
            boxShadow: '0 0 10px var(--shadow-color)',
            transition: 'all 0.3s ease'
          }}
        >
          {theme.icon}
        </button>
      ))}
    </div>
  );
};

export default ThemeSwitcher;