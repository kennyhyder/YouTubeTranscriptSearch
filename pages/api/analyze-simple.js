export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { channelUrl, keyword } = req.body;
  const API_KEY = process.env.YOUTUBE_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'No YouTube API key configured' });
  }

  if (!channelUrl || !keyword) {
    return res.status(400).json({ error: 'Channel URL and keyword are required' });
  }

  try {
    let channelId = channelUrl;
    
    // If it's a URL with @, extract the handle
    if (channelUrl.includes('@')) {
      const handle = channelUrl.split('@')[1].split('/')[0];
      
      // Search for the channel
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${handle}&type=channel&key=${API_KEY}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      
      if (searchData.items && searchData.items.length > 0) {
        channelId = searchData.items[0].snippet.channelId;
      } else {
        return res.status(404).json({ error: 'Channel not found' });
      }
    } else if (channelUrl.includes('channel/')) {
      // Extract channel ID from URL
      channelId = channelUrl.split('channel/')[1].split('/')[0].split('?')[0];
    } else if (!channelUrl.startsWith('UC')) {
      // It's not a channel ID, try to search for it
      return res.status(400).json({ error: 'Please use a channel URL or channel ID' });
    }
    
    // Get channel info
    const channelUrl2 = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${API_KEY}`;
    const channelResponse = await fetch(channelUrl2);
    const channelData = await channelResponse.json();
    
    if (!channelData.items || channelData.items.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    const channelName = channelData.items[0].snippet.title;
    
    // Get recent videos
    const videosUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=10&key=${API_KEY}`;
    const videosResponse = await fetch(videosUrl);
    const videosData = await videosResponse.json();
    
    const results = [];
    const searchKeyword = keyword.toLowerCase();
    
    for (const video of videosData.items || []) {
      const title = video.snippet.title.toLowerCase();
      const description = (video.snippet.description || '').toLowerCase();
      
      const titleMentions = (title.match(new RegExp(searchKeyword, 'g')) || []).length;
      const descMentions = (description.match(new RegExp(searchKeyword, 'g')) || []).length;
      
      if (titleMentions > 0 || descMentions > 0) {
        results.push({
          videoId: video.id.videoId,
          title: video.snippet.title,
          description: video.snippet.description,
          publishedAt: video.snippet.publishedAt,
          mentions: {
            title: titleMentions,
            description: descMentions,
            total: titleMentions + descMentions
          },
          url: `https://youtube.com/watch?v=${video.id.videoId}`
        });
      }
    }
    
    return res.status(200).json({
      channel: channelName,
      videosAnalyzed: videosData.items?.length || 0,
      keywordFound: results.length,
      results: results.sort((a, b) => b.mentions.total - a.mentions.total)
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze channel',
      details: error.message 
    });
  }
}
