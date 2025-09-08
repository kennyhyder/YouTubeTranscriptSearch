// pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [channelUrl, setChannelUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  // Check for saved theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark-mode');
    } else if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
      document.documentElement.classList.add('dark-mode');
    }
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/analyze-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl, keyword })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze channel');
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>YouTube Channel Keyword Monitor - HYDER MEDIA</title>
        <meta name="description" content="Analyze YouTube channels for keywords" />
        <link rel="icon" href="/favicon.ico" />
        {/* Google Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap" rel="stylesheet" />
      </Head>

      {/* Header */}
      <header className="header">
        <div className="container">
          <nav className="header__nav">
            <a href="/" className="header__logo">HYDER MEDIA</a>
            <button className="theme-toggle" onClick={toggleTheme}>
              <span className="theme-text">{darkMode ? 'LIGHT MODE' : 'DARK MODE'}</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="tool--section">
        <div className="container">
          <div className="tool__wrapper">
            {/* Tool Header */}
            <div className="tool__header">
              <p className="tool__badge">YouTube Analysis Tool</p>
              <h1 className="tool__title">Channel Keyword Monitor</h1>
              <p className="tool__description">
                Analyze any YouTube channel's recent videos for specific keywords. Perfect for competitive research and content strategy.
              </p>
            </div>

            {/* Search Form */}
            <form className="tool__form" onSubmit={handleSubmit}>
              <div className="form__group">
                <label className="form__label" htmlFor="channelUrl">
                  Channel URL
                </label>
                <input
                  type="text"
                  id="channelUrl"
                  className="form__input"
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  placeholder="https://youtube.com/@channelname or channel ID"
                  required
                />
              </div>
              
              <div className="form__group">
                <label className="form__label" htmlFor="keyword">
                  Keyword to Search
                </label>
                <input
                  type="text"
                  id="keyword"
                  className="form__input"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g., sponsor, product, brand name"
                  required
                />
              </div>
              
              <button type="submit" className="form__submit" disabled={loading}>
                {loading ? (
                  <>Analyzing<span className="loading"></span></>
                ) : (
                  'Analyze Channel'
                )}
              </button>
            </form>

            {/* Error Message */}
            {error && (
              <div className="error__message">
                Error: {error}
              </div>
            )}

            {/* Results Section */}
            {results && (
              <div className="results__container">
                <div className="results__summary">
                  <h2>Analysis Results</h2>
                  <div className="results__stat">
                    <strong>Channel:</strong>
                    <span>{results.channel}</span>
                  </div>
                  <div className="results__stat">
                    <strong>Videos Analyzed:</strong>
                    <span>{results.videosAnalyzed}</span>
                  </div>
                  <div className="results__stat">
                    <strong>Videos with "{keyword}":</strong>
                    <span>{results.keywordFound}</span>
                  </div>
                </div>

                {results.results && results.results.length > 0 ? (
                  <div className="results__list">
                    <h3>Videos Containing Keyword</h3>
                    {results.results.map((video) => (
                      <div key={video.videoId} className="video__card">
                        <h4 className="video__title">{video.title}</h4>
                        <p className="video__mentions">
                          Mentions: {video.mentions.total} 
                          (Title: {video.mentions.title}, Description: {video.mentions.description})
                        </p>
                        <p className="video__description">
                          {video.description?.substring(0, 200)}...
                        </p>
                        <a 
                          href={video.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="video__link"
                        >
                          Watch Video
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-results">
                    <p>No videos found containing the keyword "{keyword}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p className="footer__text">© 2024 HYDER MEDIA. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}