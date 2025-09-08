export default async function handler(req, res) {
  const { channelUrl, keyword } = req.body;
  const API_KEY = process.env.YOUTUBE_API_KEY;

  try {
    // For MrBeast's channel
    const channelId = 'UCX6OQ3DkcsbYNE6H8uQQuVA';
    
    // Get recent videos
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=10&key=${API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }
    
    const results = [];
    const searchKeyword = keyword.toLowerCase();
    
    for (const video of data.items || []) {
      const title = video.snippet.title.toLowerCase();
      if (title.includes(searchKeyword)) {
        results.push({
          title: video.snippet.title,
          url: `https://youtube.com/watch?v=${video.id.videoId}`,
          description: video.snippet.description
        });
      }
    }
    
    return res.status(200).json({
      channel: 'MrBeast',
      videosAnalyzed: data.items?.length || 0,
      keywordFound: results.length,
      results
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
