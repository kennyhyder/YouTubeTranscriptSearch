import { useState } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [channelUrl, setChannelUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);

    try {
      // Use the simple API that doesn't need database
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
    <div className={styles.container}>
      <Head>
        <title>YouTube Channel Keyword Monitor</title>
        <meta name="description" content="Monitor YouTube channels for keywords" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          YouTube Channel Keyword Monitor
        </h1>

        <div className={styles.description}>
          Enter a YouTube channel URL and a keyword to search for in recent videos
        </div>
        
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '500px', margin: '2rem 0' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Channel URL:
              <input
                type="text"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                placeholder="https://youtube.com/@channelname or channel ID"
                required
                style={{ 
                  width: '100%', 
                  padding: '0.5rem', 
                  marginTop: '0.25rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </label>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Keyword to Search:
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g., sponsor, product, etc."
                required
                style={{ 
                  width: '100%', 
                  padding: '0.5rem', 
                  marginTop: '0.25rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </label>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%',
              padding: '0.75rem', 
              background: loading ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Analyzing...' : 'Analyze Channel'}
          </button>
        </form>

        {error && (
          <div style={{ 
            color: '#ff0000', 
            padding: '1rem', 
            background: '#ffeeee',
            borderRadius: '4px',
            marginBottom: '1rem',
            maxWidth: '500px',
            width: '100%'
          }}>
            Error: {error}
          </div>
        )}

        {results && (
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <h2>Analysis Results</h2>
            <div style={{ 
              background: '#f5f5f5', 
              padding: '1rem', 
              borderRadius: '4px',
              marginBottom: '1rem'
            }}>
              <p><strong>Channel:</strong> {results.channel}</p>
              <p><strong>Videos Analyzed:</strong> {results.videosAnalyzed}</p>
              <p><strong>Videos with "{keyword}":</strong> {results.keywordFound}</p>
            </div>
            
            {results.results.length > 0 ? (
              <div>
                <h3>Videos Containing Keyword:</h3>
                {results.results.map((video) => (
                  <div key={video.videoId} style={{ 
                    border: '1px solid #ddd', 
                    padding: '1rem', 
                    marginBottom: '1rem',
                    borderRadius: '4px',
                    background: 'white'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>{video.title}</h4>
                    <p style={{ fontSize: '0.9rem', color: '#666' }}>
                      Mentions: {video.mentions.total} 
                      (Title: {video.mentions.title}, Description: {video.mentions.description})
                    </p>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      {video.description?.substring(0, 200)}...
                    </p>
                    <a 
                      href={video.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#0070f3', textDecoration: 'none' }}
                    >
                      Watch Video →
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p>No videos found containing the keyword "{keyword}"</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
