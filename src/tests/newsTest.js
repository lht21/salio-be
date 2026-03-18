import NewsScrapingService from '../services/newsScrapingService.js';
import News from '../models/News.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Test the news scraping service
const testNewsScrapingService = async () => {
  console.log('🚀 Starting News Scraping Service Test...\n');

  const newsService = new NewsScrapingService();

  try {
    // Test 1: Create sample news articles manually
    console.log('📝 Test 1: Creating sample news articles...');
    
    const sampleArticles = [
      {
        title: '한국 K-pop 산업의 성장세 지속',
        subtitle: 'BTS와 블랙핑크의 글로벌 성공으로 K-pop 수출액 증가',
        content: '한국의 K-pop 산업이 전 세계적으로 큰 성공을 거두고 있습니다. 특히 BTS와 블랙핑크 등의 그룹들이 빌보드 차트에서 좋은 성과를 보이면서 한류의 영향력이 더욱 확대되고 있습니다.',
        source: 'KBS',
        originalUrl: 'https://test.kbs.co.kr/news/sample1',
        author: 'KBS 뉴스',
        category: 'entertainment',
        difficulty: 'intermediate',
        readingTime: 5,
        keywords: ['K-pop', 'BTS', '블랙핑크', '한류', '음악'],
        tags: ['entertainment', 'KBS', 'intermediate'],
        publishedDate: new Date()
      },
      {
        title: '서울 지하철 운행 시간 연장 검토',
        subtitle: '시민들의 편의를 위한 심야 운행 시간 확대 방안',
        content: '서울시가 지하철 운행 시간을 연장하는 방안을 검토하고 있다고 발표했습니다. 이는 야간 근무자와 늦은 시간 귀가하는 시민들의 편의를 위한 조치입니다.',
        source: '연합뉴스',
        originalUrl: 'https://test.yna.co.kr/news/sample2',
        author: '연합뉴스',
        category: 'society',
        difficulty: 'beginner',
        readingTime: 3,
        keywords: ['서울', '지하철', '교통', '시민', '편의'],
        tags: ['society', '연합뉴스', 'beginner'],
        publishedDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      }
    ];

    // Save sample articles
    for (const articleData of sampleArticles) {
      const article = new News(articleData);
      await article.save();
      console.log(`✅ Created: ${article.title}`);
    }

    console.log('\n📊 Test 2: Fetching all news...');
    const allNews = await News.find({}).limit(5);
    console.log(`Found ${allNews.length} news articles:`);
    allNews.forEach(news => {
      console.log(`- ${news.title} (${news.source})`);
    });

    console.log('\n🔍 Test 3: Testing search functionality...');
    const searchResults = await News.searchNews('K-pop');
    console.log(`Search for "K-pop" found ${searchResults.length} results:`);
    searchResults.forEach(news => {
      console.log(`- ${news.title}`);
    });

    console.log('\n📂 Test 4: Testing category filtering...');
    const entertainmentNews = await News.findByCategory('entertainment');
    console.log(`Entertainment category has ${entertainmentNews.length} articles:`);
    entertainmentNews.forEach(news => {
      console.log(`- ${news.title}`);
    });

    console.log('\n📺 Test 5: Testing source filtering...');
    const kbsNews = await News.findBySource('KBS');
    console.log(`KBS source has ${kbsNews.length} articles:`);
    kbsNews.forEach(news => {
      console.log(`- ${news.title}`);
    });

    console.log('\n📈 Test 6: Testing view increment...');
    if (allNews.length > 0) {
      const firstNews = allNews[0];
      const oldViews = firstNews.views;
      await firstNews.incrementView();
      console.log(`Views increased from ${oldViews} to ${firstNews.views}`);
    }

    console.log('\n🎯 Test 7: Testing difficulty categorization...');
    const difficulties = await News.aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Articles by difficulty:');
    difficulties.forEach(diff => {
      console.log(`- ${diff._id}: ${diff.count} articles`);
    });

    // Test 8: Real scraping test (optional - commented out to avoid hitting external APIs during testing)
    /*
    console.log('\n🕷️ Test 8: Testing real news scraping...');
    console.log('⚠️  This will make actual HTTP requests to news websites');
    console.log('⏳ This may take a while...');
    
    const scrapingResults = await newsService.crawlAllNews();
    console.log('Scraping results:', scrapingResults);
    */

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Test API endpoints simulation
const testAPIEndpoints = async () => {
  console.log('\n🔗 Testing API Endpoints Simulation...\n');

  try {
    // Simulate GET /api/news
    console.log('📡 GET /api/news');
    const allNews = await News.find({ status: 'active', isApproved: true })
      .sort({ publishedDate: -1 })
      .limit(10)
      .select('-content')
      .lean();
    
    console.log(`✅ Returned ${allNews.length} articles`);
    
    // Simulate GET /api/news/recent
    console.log('\n📡 GET /api/news/recent');
    const recentNews = await News.findRecent(5);
    console.log(`✅ Returned ${recentNews.length} recent articles`);

    // Simulate GET /api/news/search?q=한국
    console.log('\n📡 GET /api/news/search?q=한국');
    const searchResults = await News.searchNews('한국');
    console.log(`✅ Search found ${searchResults.length} results`);

    // Simulate GET /api/news/category/entertainment
    console.log('\n📡 GET /api/news/category/entertainment');
    const categoryNews = await News.findByCategory('entertainment');
    console.log(`✅ Entertainment category has ${categoryNews.length} articles`);

    // Simulate stats endpoint
    console.log('\n📡 GET /api/news/stats');
    const stats = await News.aggregate([
      {
        $match: { status: 'active', isApproved: true }
      },
      {
        $group: {
          _id: null,
          totalArticles: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalBookmarks: { $sum: '$bookmarks' },
          averageReadingTime: { $avg: '$readingTime' }
        }
      }
    ]);
    
    console.log('✅ Stats:', stats[0] || { totalArticles: 0 });

  } catch (error) {
    console.error('❌ API test failed:', error);
  }
};

// Cleanup function
const cleanup = async () => {
  console.log('\n🧹 Cleaning up test data...');
  try {
    // Remove test articles
    await News.deleteMany({
      originalUrl: { $regex: /test\.(kbs\.co\.kr|yna\.co\.kr)/ }
    });
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
};

// Main test function
const runTests = async () => {
  await connectDB();
  
  try {
    await testNewsScrapingService();
    await testAPIEndpoints();
  } finally {
    await cleanup();
    await mongoose.connection.close();
    console.log('\n👋 Test completed. Database connection closed.');
  }
};

// Run tests if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { runTests, testNewsScrapingService, testAPIEndpoints, cleanup };