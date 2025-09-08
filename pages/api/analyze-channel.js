import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_KEY = process.env.YOUTUBE_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { channelUrl, keyword } = req.body;

  if (!channelUrl || !keyword) {
    return res.status(400).json({ error: 'Channel URL and keyword are required' });
  }

  try {
    // Extract channel ID or handle from URL
    let channelId = extractChannelId(channelUrl);
    
    // If it's a @ handle, we need to search for it first
    if (channelUrl.includes('@')) {
      const handle = channelUrl.split('@')[1].split('/')[0];
      console.log('Searching for handle:', handle);
      
      // Search for the channel by handle
      const searchResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${handle}&type=channel&key=${API_KEY}`
      );
      
      if (searchResponse.data.items && searchResponse.data.items.length > 0) {
        channelId = searchResponse.data.items[0].snippet.channelId;
        console.log('Found channel ID:', channelId);
      } else {
        return res.status(404).json({ error: 'Channel not found' });
      }
    }
    
    // Get channel info
    const channelResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${API_KEY}`
    );

    if (!channelResponse.data.items?.length) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channelData = channelResponse.data.items[0];
    
    // Save or update channel
    const channel = await prisma.channel.upsert({
      where: { channelId },
      update: { name: channelData.snippet.title },
      create: {
        channelId,
        name: channelData.snippet.title,
        description: channelData.snippet.description
      }
    });

    // Get recent videos
    const videosResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=10&key=${API_KEY}`
    );

    const videos = videosResponse.data.items || [];
    const results = [];

    for (const video of videos) {
      // Check video title and description for keyword
      const title = video.snippet.title.toLowerCase();
      const description = (video.snippet.description || '').toLowerCase();
      const searchKeyword = keyword.toLowerCase();
      
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

        // Save to database
        await prisma.video.upsert({
          where: { videoId: video.id.videoId },
          update: {},
          create: {
            videoId: video.id.videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            channelId: channel.id,
            publishedAt: new Date(video.snippet.publishedAt)
          }
        });
      }
    }

    res.status(200).json({
      channel: channelData.snippet.title,
      videosAnalyzed: videos.length,
      keywordFound: results.length,
      results: results.sort((a, b) => b.mentions.total - a.mentions.total)
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error);
    res.status(500).json({ 
      error: 'Failed to analyze channel', 
      details: error.response?.data?.error?.message || error.message 
    });
  }
}

function extractChannelId(url) {
  // Handle direct channel IDs
  if (url.startsWith('UC')) {
    return url;
  }
  
  // Handle different YouTube URL formats
  const patterns = [
    /youtube\.com\/channel\/([^\/\?]+)/,
    /youtube\.com\/c\/([^\/\?]+)/,
    /youtube\.com\/@([^\/\?]+)/,
    /youtube\.com\/user\/([^\/\?]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // If no pattern matches, assume it's already a channel ID or handle
  return url;
}
