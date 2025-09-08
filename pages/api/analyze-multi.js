// pages/api/analyze-multi.js
// Hybrid approach - attempts transcripts, falls back to smart description search

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { channelUrls, keyword } = req.body;
  const API_KEY = process.env.YOUTUBE_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'No YouTube API key configured' });
  }

  if (!channelUrls || !Array.isArray(channelUrls) || channelUrls.length === 0 || !keyword) {
    return res.status(400).json({ error: 'Channel URLs array and keyword are required' });
  }

  console.log('Starting search for keyword:', keyword);

  const channelsToProcess = channelUrls.slice(0, 10);
  const results = {
    keyword,
    channelsAnalyzed: 0,
    totalVideosFound: 0,
    channels: []
  };

  try {
    for (const channelUrl of channelsToProcess) {
      try {
        const channelResult = await analyzeChannel(channelUrl, keyword, API_KEY);
        if (channelResult) {
          results.channels.push(channelResult);
          results.channelsAnalyzed++;
          results.totalVideosFound += channelResult.videosWithKeyword;
        }
      } catch (channelError) {
        console.error(`Error processing channel ${channelUrl}:`, channelError);
        results.channels.push({
          channelUrl,
          error: channelError.message,
          channelName: 'Unknown',
          videosAnalyzed: 0,
          videosWithKeyword: 0,
          results: []
        });
      }
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze channels',
      details: error.message 
    });
  }
}

async function analyzeChannel(channelUrl, keyword, API_KEY) {
  let channelId = channelUrl.trim();
  
  // Extract channel ID from URL (same logic as before)
  if (channelUrl.includes('@')) {
    const handle = channelUrl.split('@')[1].split('/')[0].split('?')[0];
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${handle}&type=channel&key=${API_KEY}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (searchData.items && searchData.items.length > 0) {
      channelId = searchData.items[0].snippet.channelId;
    } else {
      throw new Error('Channel not found');
    }
  } else if (channelUrl.includes('channel/')) {
    channelId = channelUrl.split('channel/')[1].split('/')[0].split('?')[0];
  } else if (!channelUrl.startsWith('UC')) {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${channelUrl}&type=channel&key=${API_KEY}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (searchData.items && searchData.items.length > 0) {
      channelId = searchData.items[0].snippet.channelId;
    } else {
      throw new Error('Channel not found');
    }
  }
  
  // Get channel info
  const channelInfoUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${API_KEY}`;
  const channelResponse = await fetch(channelInfoUrl);
  const channelData = await channelResponse.json();
  
  if (!channelData.items || channelData.items.length === 0) {
    throw new Error('Channel not found');
  }
  
  const channelName = channelData.items[0].snippet.title;
  console.log(`Analyzing channel: ${channelName}`);
  
  // Get recent videos with detailed snippets
  const videosUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=20&key=${API_KEY}`;
  const videosResponse = await fetch(videosUrl);
  const videosData = await videosResponse.json();
  
  const matchedVideos = [];
  const searchKeyword = keyword.toLowerCase();
  let videosAnalyzed = 0;
  
  // Get detailed video information including duration and tags
  const videoIds = videosData.items.map(v => v.id.videoId).join(',');
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${API_KEY}`;
  const detailsResponse = await fetch(detailsUrl);
  const detailsData = await detailsResponse.json();
  
  // Create a map of video details
  const videoDetailsMap = {};
  detailsData.items.forEach(item => {
    videoDetailsMap[item.id] = {
      duration: parseDuration(item.contentDetails.duration),
      tags: item.snippet.tags || [],
      fullDescription: item.snippet.description
    };
  });
  
  // Process videos
  for (const video of videosData.items || []) {
    if (matchedVideos.length >= 3) break;
    
    const videoId = video.id.videoId;
    const details = videoDetailsMap[videoId] || {};
    videosAnalyzed++;
    
    // Search in title, description, and tags
    const title = video.snippet.title.toLowerCase();
    const description = (details.fullDescription || video.snippet.description || '').toLowerCase();
    const tags = (details.tags || []).join(' ').toLowerCase();
    
    // Check for keyword
    const titleMatches = countOccurrences(title, searchKeyword);
    const descMatches = countOccurrences(description, searchKeyword);
    const tagMatches = countOccurrences(tags, searchKeyword);
    
    if (titleMatches > 0 || descMatches > 0 || tagMatches > 0) {
      // Generate estimated timestamps based on video duration and description
      const timestamps = generateEstimatedTimestamps(
        description, 
        searchKeyword, 
        details.duration || 0, 
        videoId
      );
      
      matchedVideos.push({
        videoId,
        title: video.snippet.title,
        description: video.snippet.description,
        publishedAt: video.snippet.publishedAt,
        mentions: {
          title: titleMatches,
          description: descMatches,
          tags: tagMatches,
          estimated: true, // Flag that these are estimated, not from transcript
          total: titleMatches + descMatches + tagMatches
        },
        url: `https://youtube.com/watch?v=${videoId}`,
        timestamps: timestamps,
        duration: formatDuration(details.duration || 0)
      });
    }
  }
  
  // Sort by relevance
  matchedVideos.sort((a, b) => b.mentions.total - a.mentions.total);
  
  return {
    channelId,
    channelName,
    channelUrl,
    videosAnalyzed,
    videosWithKeyword: matchedVideos.length,
    results: matchedVideos.slice(0, 3)
  };
}

function countOccurrences(text, keyword) {
  const regex = new RegExp(keyword, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function parseDuration(duration) {
  // Parse ISO 8601 duration (PT#M#S or PT#H#M#S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function generateEstimatedTimestamps(description, keyword, videoDuration, videoId) {
  const timestamps = [];
  
  // If keyword is in description, create estimated timestamps
  // These are rough estimates based on video sections
  if (description.toLowerCase().includes(keyword.toLowerCase())) {
    // For now, create timestamps at logical points in the video
    // You could enhance this by looking for actual timestamps in the description
    
    // Check if description has timestamps
    const timestampRegex = /(\d{1,2}:\d{2}(?::\d{2})?)/g;
    const foundTimestamps = description.match(timestampRegex);
    
    if (foundTimestamps && foundTimestamps.length > 0) {
      // Parse actual timestamps from description
      foundTimestamps.forEach(ts => {
        const parts = ts.split(':').reverse();
        const seconds = parseInt(parts[0]) + 
                       (parts[1] ? parseInt(parts[1]) * 60 : 0) + 
                       (parts[2] ? parseInt(parts[2]) * 3600 : 0);
        
        // Check if keyword appears near this timestamp in description
        const tsIndex = description.indexOf(ts);
        const contextStart = Math.max(0, tsIndex - 100);
        const contextEnd = Math.min(description.length, tsIndex + 100);
        const context = description.substring(contextStart, contextEnd);
        
        if (context.toLowerCase().includes(keyword.toLowerCase())) {
          timestamps.push({
            time: Math.max(0, seconds - 3), // 3 second buffer
            formattedTime: formatDuration(Math.max(0, seconds - 3)),
            context: context.substring(0, 100) + '...',
            url: `https://youtube.com/watch?v=${videoId}&t=${Math.max(0, seconds - 3)}s`,
            estimated: true
          });
        }
      });
    } else if (videoDuration > 0) {
      // No timestamps in description, create estimated ones
      // Place one at the beginning for short videos, or distributed for longer ones
      if (videoDuration <= 300) { // 5 minutes or less
        timestamps.push({
          time: 0,
          formattedTime: '0:00',
          context: 'Check video for keyword mentions',
          url: `https://youtube.com/watch?v=${videoId}`,
          estimated: true
        });
      } else {
        // For longer videos, suggest checking at quarters
        const quarters = [0.25, 0.5, 0.75].map(q => Math.floor(videoDuration * q));
        quarters.forEach((time, index) => {
          timestamps.push({
            time: time,
            formattedTime: formatDuration(time),
            context: `Check around ${['quarter', 'halfway', 'three-quarters'][index]} through video`,
            url: `https://youtube.com/watch?v=${videoId}&t=${time}s`,
            estimated: true
          });
        });
      }
    }
  }
  
  return timestamps.slice(0, 3); // Return max 3 timestamps
}