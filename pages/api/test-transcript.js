// pages/api/test-transcript.js
// Simple test endpoint to verify transcript fetching works

import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(req, res) {
  const { videoUrl } = req.query;
  
  // Default test video if none provided
  const testVideoId = videoUrl ? 
    videoUrl.split('v=')[1]?.split('&')[0] : 
    'Ks-_Mh1QhMc'; // Example video ID
  
  console.log(`Testing transcript for video ID: ${testVideoId}`);
  
  try {
    // Try to fetch transcript
    const transcript = await YoutubeTranscript.fetchTranscript(testVideoId);
    
    if (!transcript || transcript.length === 0) {
      return res.status(404).json({ 
        error: 'No transcript found',
        videoId: testVideoId 
      });
    }
    
    // Get first few segments as sample
    const sample = transcript.slice(0, 5).map(segment => ({
      text: segment.text,
      offset: segment.offset,
      duration: segment.duration
    }));
    
    // Combine all text
    const fullText = transcript.map(s => s.text).join(' ');
    
    return res.status(200).json({
      success: true,
      videoId: testVideoId,
      segments: transcript.length,
      totalLength: fullText.length,
      sample: sample,
      firstHundredChars: fullText.substring(0, 100)
    });
    
  } catch (error) {
    console.error('Transcript error:', error);
    return res.status(500).json({
      error: error.message,
      videoId: testVideoId,
      stack: error.stack
    });
  }
}