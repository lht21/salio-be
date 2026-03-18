#!/usr/bin/env node
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import News from '../models/News.js';

dotenv.config();

const app = express();
const PORT = 5001; // Use different port to avoid conflicts

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection failed:', err));

// Test route for recent news
app.get('/api/news/recent', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const news = await News.find({ 
      status: 'active', 
      isApproved: true 
    })
    .sort({ publishedDate: -1 })
    .limit(parseInt(limit))
    .select('-content')
    .lean();

    const formattedNews = news.map(article => ({
      id: article._id,
      title: article.title,
      subtitle: article.subtitle,
      summary: article.summary,
      source: article.source,
      author: article.author,
      category: article.category,
      difficulty: article.difficulty,
      readingTime: article.readingTime,
      imageUrl: article.imageUrl,
      publishedDate: article.publishedDate,
      views: article.views,
      likes: article.likes,
      bookmarks: article.bookmarks,
      keywords: article.keywords,
      tags: article.tags
    }));

    res.json({
      success: true,
      data: {
        news: formattedNews,
        pagination: {
          current: 1,
          total: 1,
          limit: parseInt(limit),
          totalItems: formattedNews.length
        }
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news',
      error: error.message
    });
  }
});

// Test route for news by category
app.get('/api/news/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;

    const news = await News.find({ 
      category,
      status: 'active', 
      isApproved: true 
    })
    .sort({ publishedDate: -1 })
    .limit(parseInt(limit))
    .select('-content')
    .lean();

    const formattedNews = news.map(article => ({
      id: article._id,
      title: article.title,
      subtitle: article.subtitle,
      summary: article.summary,
      source: article.source,
      author: article.author,
      difficulty: article.difficulty,
      readingTime: article.readingTime,
      imageUrl: article.imageUrl,
      publishedDate: article.publishedDate,
      views: article.views,
      bookmarks: article.bookmarks
    }));

    res.json({
      success: true,
      data: {
        category,
        news: formattedNews,
        total: formattedNews.length
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news by category',
      error: error.message
    });
  }
});

// Get news statistics
app.get('/api/news/stats', async (req, res) => {
  try {
    const stats = await News.aggregate([
      {
        $match: {
          status: 'active',
          isApproved: true
        }
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

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalArticles: 0,
          totalViews: 0,
          totalBookmarks: 0,
          averageReadingTime: 0
        }
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news stats',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test news server running on port ${PORT}`);
  console.log(`📊 Test URLs:`);
  console.log(`   - http://localhost:${PORT}/api/news/recent`);
  console.log(`   - http://localhost:${PORT}/api/news/category/entertainment`);
  console.log(`   - http://localhost:${PORT}/api/news/stats`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down test server...');
  await mongoose.connection.close();
  process.exit(0);
});