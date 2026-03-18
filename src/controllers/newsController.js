import News from '../models/News.js';
import NewsScrapingService from '../services/newsScrapingService.js';

const newsScrapingService = new NewsScrapingService();

export const getAllNews = async (req, res) => {
  try {
    const {
      category,
      source,
      difficulty,
      page = 1,
      limit = 20,
      search,
      sortBy = 'publishedDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {
      status: 'active',
      isApproved: true
    };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (source && source !== 'all') {
      filter.source = source;
    }

    if (difficulty) {
      filter.difficulty = difficulty;
    }

    // Handle search
    let query = News.find(filter);

    if (search) {
      query = News.find({
        ...filter,
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { subtitle: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
          { keywords: { $in: [new RegExp(search, 'i')] } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      });
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const news = await query
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-content') // Exclude full content for list view
      .lean();

    // Get total count for pagination
    const total = await News.countDocuments(filter);

    // Format response
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
          current: parseInt(page),
          total: Math.ceil(total / limit),
          limit: parseInt(limit),
          totalItems: total
        },
        filters: {
          category,
          source,
          difficulty,
          search
        }
      }
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news',
      error: error.message
    });
  }
};

export const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;

    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    // Increment view count
    await news.incrementView();

    res.json({
      success: true,
      data: {
        id: news._id,
        title: news.title,
        subtitle: news.subtitle,
        content: news.content,
        summary: news.summary,
        source: news.source,
        originalUrl: news.originalUrl,
        author: news.author,
        category: news.category,
        difficulty: news.difficulty,
        readingTime: news.readingTime,
        imageUrl: news.imageUrl,
        videoUrl: news.videoUrl,
        vocabularyWords: news.vocabularyWords,
        grammarPoints: news.grammarPoints,
        publishedDate: news.publishedDate,
        views: news.views,
        likes: news.likes,
        bookmarks: news.bookmarks,
        keywords: news.keywords,
        tags: news.tags,
        formattedDate: news.formattedDate
      }
    });
  } catch (error) {
    console.error('Error fetching news by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news article',
      error: error.message
    });
  }
};

export const getNewsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;

    const news = await News.findByCategory(category)
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
    console.error('Error fetching news by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news by category',
      error: error.message
    });
  }
};

export const getNewsBySource = async (req, res) => {
  try {
    const { source } = req.params;
    const { limit = 10 } = req.query;

    const news = await News.findBySource(source)
      .limit(parseInt(limit))
      .select('-content')
      .lean();

    const formattedNews = news.map(article => ({
      id: article._id,
      title: article.title,
      subtitle: article.subtitle,
      summary: article.summary,
      category: article.category,
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
        source,
        news: formattedNews,
        total: formattedNews.length
      }
    });
  } catch (error) {
    console.error('Error fetching news by source:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news by source',
      error: error.message
    });
  }
};

export const getRecentNews = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const news = await News.findRecent(parseInt(limit))
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
      bookmarks: article.bookmarks
    }));

    res.json({
      success: true,
      data: {
        news: formattedNews,
        total: formattedNews.length
      }
    });
  } catch (error) {
    console.error('Error fetching recent news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent news',
      error: error.message
    });
  }
};

export const searchNews = async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const news = await News.searchNews(query)
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
      bookmarks: article.bookmarks,
      keywords: article.keywords
    }));

    res.json({
      success: true,
      data: {
        query,
        news: formattedNews,
        total: formattedNews.length
      }
    });
  } catch (error) {
    console.error('Error searching news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search news',
      error: error.message
    });
  }
};

export const toggleBookmark = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'add' or 'remove'

    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    if (action === 'add') {
      await news.addBookmark();
    } else if (action === 'remove') {
      await news.removeBookmark();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "add" or "remove"'
      });
    }

    res.json({
      success: true,
      data: {
        id: news._id,
        bookmarks: news.bookmarks
      }
    });
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle bookmark',
      error: error.message
    });
  }
};

export const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated via API
    delete updateData.views;
    delete updateData.originalUrl;
    delete updateData.lastCrawled;

    const news = await News.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    res.json({
      success: true,
      data: news
    });
  } catch (error) {
    console.error('Error updating news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update news',
      error: error.message
    });
  }
};

export const crawlNews = async (req, res) => {
  try {
    console.log('🚀 Manual news crawling initiated...');
    
    const results = await newsScrapingService.crawlAllNews();
    
    res.json({
      success: true,
      message: 'News crawling completed',
      data: results
    });
  } catch (error) {
    console.error('Error during manual crawling:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to crawl news',
      error: error.message
    });
  }
};

export const getNewsStats = async (req, res) => {
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
          averageReadingTime: { $avg: '$readingTime' },
          sourceStats: {
            $push: {
              source: '$source',
              category: '$category',
              difficulty: '$difficulty'
            }
          }
        }
      }
    ]);

    const sourceBreakdown = await News.aggregate([
      {
        $match: {
          status: 'active',
          isApproved: true
        }
      },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const categoryBreakdown = await News.aggregate([
      {
        $match: {
          status: 'active',
          isApproved: true
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' }
        }
      },
      {
        $sort: { count: -1 }
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
        },
        bySource: sourceBreakdown,
        byCategory: categoryBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching news stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news statistics',
      error: error.message
    });
  }
};

// Get related news articles
export const getRelatedNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 3 } = req.query;
    
    // First get the current article to find related ones
    const currentArticle = await News.findById(id);
    
    if (!currentArticle) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }
    
    // Find related articles based on category and keywords
    const relatedArticles = await News.find({
      _id: { $ne: id }, // Exclude current article
      status: 'active',
      isApproved: true,
      $or: [
        { category: currentArticle.category },
        { keywords: { $in: currentArticle.keywords } },
        { tags: { $in: currentArticle.tags } }
      ]
    })
    .sort({ publishedDate: -1 })
    .limit(parseInt(limit))
    .select('title subtitle source author category difficulty readingTime imageUrl publishedDate views likes bookmarks keywords tags')
    .lean();
    
    const formattedRelated = relatedArticles.map(article => ({
      id: article._id,
      title: article.title,
      subtitle: article.subtitle,
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
      data: formattedRelated
    });
  } catch (error) {
    console.error('Get related news error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};