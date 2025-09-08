// pages/api/test-transcript-alt.js
// Alternative method using direct YouTube API

export default async function handler(req, res) {
  const { videoUrl } = req.query;
  const API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!API_KEY) {
    return res.status(500).json({ error: 'No YouTube API key configured' });
  }
  
  // Extract video ID
  const videoId = videoUrl ? 
    videoUrl.split('v=')[1]?.split('&')[0] : 
    'Ks-_Mh1QhMc'; // Test video
  
  console.log(`Testing captions for video ID: ${videoId}`);
  
  try {
    // First, get video details to confirm it exists
    const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;
    const videoResponse = await fetch(videoUrl);
    const videoData = await videoResponse.json();
    
    if (!videoData.items || videoData.items.length === 0) {
      return res.status(404).json({ 
        error: 'Video not found',
        videoId 
      });
    }
    
    const videoTitle = videoData.items[0].snippet.title;
    
    // Check if captions are available
    const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${API_KEY}`;
    const captionsResponse = await fetch(captionsUrl);
    const captionsData = await captionsResponse.json();
    
    // Try alternative method - scraping from YouTube page
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(ytUrl);
    const pageText = await pageResponse.text();
    
    // Check if captions are available in the page
    const hasCaptions = pageText.includes('"captions"') || pageText.includes('captionTracks');
    
    // Try to extract caption URL from page
    const captionMatch = pageText.match(/"captionTracks":\[([^\]]+)\]/);
    let captionInfo = null;
    
    if (captionMatch) {
      try {
        captionInfo = JSON.parse(`[${captionMatch[1]}]`);
      } catch (e) {
        console.log('Could not parse caption data');
      }
    }
    
    return res.status(200).json({
      videoId,
      videoTitle,
      apiCaptions: captionsData,
      hasCaptionsInPage: hasCaptions,
      captionTracksFound: captionInfo ? captionInfo.length : 0,
      availableLanguages: captionInfo ? captionInfo.map(c => c.languageCode) : [],
      message: 'Check console for detailed info',
      alternativeApproach: 'Try using youtubei.js package instead'
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: error.message,
      videoId
    });
  }
}