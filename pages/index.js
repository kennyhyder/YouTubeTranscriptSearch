// pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [channelUrls, setChannelUrls] = useState('');
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

    // Parse channel URLs (split by newlines or commas)
    const urlList = channelUrls
      .split(/[\n,]/)
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urlList.length === 0) {
      setError('Please enter at least one channel URL');
      setLoading(false);
      return;
    }

    if (urlList.length > 10) {
      setError('Maximum 10 channels at a time');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/analyze-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          channelUrls: urlList, 
          keyword 
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze channels');
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
        <title>YouTube Transcript Search - HYDER MEDIA</title>
        <meta name="description" content="Search YouTube video transcripts for keywords with precise timestamps" />
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
              <p className="tool__badge">YouTube Transcript Search v2.0</p>
              <h1 className="tool__title">Multi-Channel Transcript Analyzer</h1>
              <p className="tool__description">
                Search video transcripts across multiple YouTube channels. Find exact moments where keywords are spoken with direct timestamp links.
              </p>
            </div>

            {/* Search Form */}
            <form className="tool__form" onSubmit={handleSubmit}>
              <div className="form__group">
                <label className="form__label" htmlFor="channelUrls">
                  Channel URLs (One per line, max 10)
                </label>
                <textarea
                  id="channelUrls"
                  className="form__textarea"
                  value={channelUrls}
                  onChange={(e) => setChannelUrls(e.target.value)}
                  placeholder="https://youtube.com/@channel1&#10;https://youtube.com/@channel2&#10;@channel3&#10;UCX6OQ3DkcsbYNE6H8uQQuVA"
                  rows={5}
                  required
                />
                <span className="form__help">
                  Enter multiple channel URLs, handles (@username), or channel IDs. One per line or comma-separated.
                </span>
              </div>
              
              <div className="form__group">
                <label className="form__label" htmlFor="keyword">
                  Keyword to Search in Transcripts
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
                  <>Searching Transcripts<span className="loading"></span></>
                ) : (
                  'Search All Transcripts'
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
                {/* Overall Summary */}
                <div className="results__summary">
                  <h2>Search Results</h2>
                  <div className="results__stat">
                    <strong>Channels Analyzed:</strong>
                    <span>{results.channelsAnalyzed}</span>
                  </div>
                  <div className="results__stat">
                    <strong>Total Videos with Transcript Matches:</strong>
                    <span>{results.totalVideosFound}</span>
                  </div>
                  <div className="results__stat">
                    <strong>Keyword Searched:</strong>
                    <span>"{results.keyword}"</span>
                  </div>
                </div>

                {/* Results by Channel */}
                {results.channels && results.channels.map((channel, idx) => (
                  <div key={idx} className="channel__section">
                    <div className="channel__header">
                      <h3 className="channel__name">{channel.channelName}</h3>
                      {channel.error ? (
                        <span className="channel__error">Error: {channel.error}</span>
                      ) : (
                        <span className="channel__stats">
                          {channel.videosWithKeyword} videos with transcript matches (checked {channel.videosAnalyzed} videos)
                        </span>
                      )}
                    </div>

                    {channel.results && channel.results.length > 0 ? (
                      <div className="channel__videos">
                        {channel.results.map((video) => (
                          <div key={video.videoId} className="video__card">
                            <h4 className="video__title">{video.title}</h4>
                            
                            <div className="video__mentions">
                              <span className="mention__badge">
                                {video.mentions.estimated ? (
                                  <>
                                    {video.mentions.total} mention{video.mentions.total !== 1 ? 's' : ''} 
                                    (Title: {video.mentions.title}, Desc: {video.mentions.description}, Tags: {video.mentions.tags || 0})
                                  </>
                                ) : (
                                  <>
                                    {video.mentions.transcript} transcript mention{video.mentions.transcript !== 1 ? 's' : ''}
                                  </>
                                )}
                              </span>
                              {video.mentions.estimated && (
                                <span className="mention__note">⚠️ No transcript available - searched description</span>
                              )}
                            </div>
                            
                            <p className="video__description">
                              {video.description?.substring(0, 150)}...
                            </p>
                            
                            {/* Timestamp Links */}
                            {video.timestamps && video.timestamps.length > 0 && (
                              <div className="video__timestamps">
                                <h5 className="timestamps__label">Jump to mentions:</h5>
                                <div className="timestamps__list">
                                  {video.timestamps.map((timestamp, tsIdx) => (
                                    <a 
                                      key={tsIdx}
                                      href={timestamp.url || `${video.url}&t=${Math.floor(timestamp.time)}s`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="timestamp__link"
                                      title={timestamp.context}
                                    >
                                      {timestamp.formattedTime}
                                    </a>
                                  ))}
                                </div>
                                {video.timestamps[0]?.context && (
                                  <div className="timestamp__context">
                                    <em>"...{video.timestamps[0].context}..."</em>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="video__actions">
                              <a 
                                href={video.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="video__link"
                              >
                                Watch Full Video
                              </a>
                              <span className="video__date">
                                {new Date(video.publishedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-results">
                        {channel.error ? 
                          `Could not analyze this channel` : 
                          `No videos found with "${results.keyword}" in transcripts`
                        }
                      </div>
                    )}
                  </div>
                ))}
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