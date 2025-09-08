// Load environment variables
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
  console.error('❌ No API key found in .env.local');
  process.exit(1);
}

console.log('🔑 API Key found:', API_KEY.substring(0, 10) + '...');

// Test the YouTube API
async function testYouTubeAPI() {
  try {
    console.log('\n📺 Testing YouTube API...\n');
    
    // Search for a popular channel (using MrBeast as example)
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=MrBeast&type=channel&key=${API_KEY}`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (data.error) {
      console.error('❌ API Error:', data.error.message);
      if (data.error.message.includes('API key not valid')) {
        console.log('\n💡 Please check that:');
        console.log('1. Your API key is correct in .env.local');
        console.log('2. YouTube Data API v3 is enabled in Google Cloud Console');
        console.log('3. The API key has no restrictions or includes YouTube API in restrictions');
      }
      return;
    }
    
    if (data.items && data.items.length > 0) {
      console.log('✅ API is working!\n');
      console.log('Found channels:');
      data.items.slice(0, 3).forEach(item => {
        console.log(`  - ${item.snippet.channelTitle}`);
      });
      
      // Test video search
      console.log('\n🎥 Testing video search...');
      const channelId = data.items[0].snippet.channelId;
      const videosUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&maxResults=3&order=date&key=${API_KEY}`;
      
      const videoResponse = await fetch(videosUrl);
      const videoData = await videoResponse.json();
      
      if (videoData.items && videoData.items.length > 0) {
        console.log('\nRecent videos from', data.items[0].snippet.channelTitle + ':');
        videoData.items.forEach(video => {
          console.log(`  - ${video.snippet.title}`);
        });
        console.log('\n✅ Full API test successful! Your key is working perfectly.');
      }
    } else {
      console.log('⚠️  API responded but no results found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('fetch is not defined')) {
      console.log('\n🔧 Fixing Node.js version issue...');
      console.log('Run this command instead:');
      console.log('node --version');
    }
  }
}

// Run the test
testYouTubeAPI();
