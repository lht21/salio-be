import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import News from '../models/News.js';

class NewsScrapingService {
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['author', 'category', 'pubDate']
      }
    });
    
    // Configure axios with headers to avoid blocking
    this.axiosInstance = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000
    });
  }

  // RSS feeds for Korean news sources
  getRSSFeeds() {
    return {
      '연합뉴스': {
        culture: 'https://www.yna.co.kr/rss/culture.xml',
        entertainment: 'https://www.yna.co.kr/rss/entertainment.xml',
        sports: 'https://www.yna.co.kr/rss/sports.xml',
        economy: 'https://www.yna.co.kr/rss/economy.xml',
        politics: 'https://www.yna.co.kr/rss/politics.xml'
      },
      'KBS': {
        culture: 'https://world.kbs.co.kr/rss/rss_news.htm?lang=korean&id=Po',
        entertainment: 'https://world.kbs.co.kr/rss/rss_news.htm?lang=korean&id=En',
        sports: 'https://world.kbs.co.kr/rss/rss_news.htm?lang=korean&id=Sp'
      }
    };
  }

  // Category mapping for different sources
  getCategoryMapping(source) {
    const mappings = {
      '연합뉴스': {
        '문화': 'culture',
        '연예': 'entertainment',
        '스포츠': 'sports',
        '경제': 'economy',
        '정치': 'politics',
        '사회': 'society',
        '기술': 'technology',
        '음식': 'food'
      },
      'KBS': {
        '문화': 'culture',
        '연예': 'entertainment',
        '스포츠': 'sports',
        '경제': 'economy',
        '정치': 'politics'
      }
    };
    
    return mappings[source] || {};
  }

  // Determine difficulty based on content analysis
  calculateDifficulty(content, title) {
    const text = (title + ' ' + content).toLowerCase();
    
    // Advanced keywords (politics, economy, complex topics)
    const advancedKeywords = ['정책', '경제', '정치', '법률', '규제', '헌법', '국회', '정부', '장관', '대통령', '외교', '무역', '금융'];
    
    // Beginner keywords (daily life, simple topics)
    const beginnerKeywords = ['일상', '가족', '친구', '음식', '날씨', '쇼핑', '여행', '영화', '음악', '게임'];
    
    const advancedCount = advancedKeywords.filter(keyword => text.includes(keyword)).length;
    const beginnerCount = beginnerKeywords.filter(keyword => text.includes(keyword)).length;
    
    if (advancedCount > 2) return 'advanced';
    if (beginnerCount > 2) return 'beginner';
    return 'intermediate';
  }

  // Extract vocabulary words from Korean text
  extractVocabulary(content) {
    // This is a simplified version - in production, you'd use Korean NLP libraries
    const vocabulary = [];
    
    // Common Korean learning vocabulary patterns
    const patterns = [
      /([가-힣]{2,})하다/g, // verbs ending in 하다
      /([가-힣]{2,})되다/g, // passive verbs
      /([가-힣]{3,})(?=\s|$|[.,!?])/g // 3+ character words
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.slice(0, 5).forEach(word => { // Limit to 5 words
          vocabulary.push({
            word: word,
            meaning: '', // Would need translation API
            pronunciation: '',
            difficulty: this.calculateDifficulty('', word)
          });
        });
      }
    });
    
    return vocabulary;
  }

  // Scrape article content from URL
  async scrapeArticleContent(url, source) {
    try {
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      
      let content = '';
      let imageUrl = '';
      
      // Different selectors for different news sources
      switch (source) {
        case '연합뉴스':
          content = $('.story-news-article').text() || $('.article-txt').text();
          imageUrl = $('.news-photo img').attr('src') || $('.article-photo img').attr('src');
          break;
          
        case 'KBS':
          content = $('.detail-body').text() || $('.news-content').text();
          imageUrl = $('.news-photo img').attr('src') || $('.detail-image img').attr('src');
          break;
          
        default:
          // Generic selectors
          content = $('article').text() || $('.content').text() || $('.article-content').text();
          imageUrl = $('article img').first().attr('src') || $('.content img').first().attr('src');
      }
      
      // Clean up content
      content = content.replace(/\s+/g, ' ').trim();
      
      // Make image URL absolute if it's relative
      if (imageUrl && imageUrl.startsWith('/')) {
        const baseUrl = new URL(url).origin;
        imageUrl = baseUrl + imageUrl;
      }
      
      return { content, imageUrl };
    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
      return { content: '', imageUrl: '' };
    }
  }

  // Parse RSS feed and extract articles
  async parseRSSFeed(feedUrl, source, category) {
    try {
      const feed = await this.parser.parseURL(feedUrl);
      const articles = [];
      
      for (const item of feed.items.slice(0, 10)) { // Limit to 10 recent articles
        try {
          // Check if article already exists
          const existing = await News.findOne({ originalUrl: item.link });
          if (existing) continue;
          
          // Scrape full content
          const { content, imageUrl } = await this.scrapeArticleContent(item.link, source);
          
          if (!content) continue; // Skip if no content found
          
          // Extract metadata
          const vocabulary = this.extractVocabulary(content);
          const difficulty = this.calculateDifficulty(content, item.title);
          
          const article = {
            title: item.title,
            subtitle: item.contentSnippet || item.summary || '',
            content: content,
            summary: item.contentSnippet || content.substring(0, 500) + '...',
            source: source,
            originalUrl: item.link,
            author: item.author || source,
            category: category,
            difficulty: difficulty,
            imageUrl: imageUrl,
            vocabularyWords: vocabulary,
            publishedDate: new Date(item.pubDate || item.isoDate || Date.now()),
            keywords: this.extractKeywords(item.title + ' ' + content),
            tags: [category, source, difficulty]
          };
          
          articles.push(article);
        } catch (error) {
          console.error(`Error processing article ${item.link}:`, error.message);
          continue;
        }
      }
      
      return articles;
    } catch (error) {
      console.error(`Error parsing RSS feed ${feedUrl}:`, error.message);
      return [];
    }
  }

  // Extract keywords from text
  extractKeywords(text) {
    const keywords = [];
    
    // Common Korean keywords to extract
    const keywordPatterns = [
      /한국/g, /서울/g, /부산/g, /대구/g, /인천/g, // Places
      /정부/g, /대통령/g, /국회/g, /선거/g, // Politics
      /경제/g, /기업/g, /삼성/g, /LG/g, /현대/g, // Economy
      /K-pop/g, /드라마/g, /영화/g, /방탄소년단/g, /블랙핑크/g, // Entertainment
      /축구/g, /야구/g, /태권도/g, /올림픽/g // Sports
    ];
    
    keywordPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (!keywords.includes(match)) {
            keywords.push(match);
          }
        });
      }
    });
    
    return keywords;
  }

  // Main method to crawl all news sources
  async crawlAllNews() {
    console.log('🕷️ Starting news crawling...');
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      sources: {}
    };
    
    const feeds = this.getRSSFeeds();
    
    for (const [source, categories] of Object.entries(feeds)) {
      results.sources[source] = { success: 0, failed: 0 };
      
      for (const [category, feedUrl] of Object.entries(categories)) {
        try {
          console.log(`📰 Crawling ${source} - ${category}`);
          const articles = await this.parseRSSFeed(feedUrl, source, category);
          
          for (const articleData of articles) {
            try {
              const article = new News(articleData);
              await article.save();
              results.success++;
              results.sources[source].success++;
              console.log(`✅ Saved: ${article.title}`);
            } catch (error) {
              if (error.code === 11000) {
                results.skipped++;
                console.log(`⏭️ Skipped duplicate: ${articleData.title}`);
              } else {
                results.failed++;
                results.sources[source].failed++;
                console.error(`❌ Failed to save: ${articleData.title}`, error.message);
              }
            }
          }
          
          // Add delay between requests to be respectful
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`❌ Error crawling ${source} - ${category}:`, error.message);
          results.failed++;
          results.sources[source].failed++;
        }
      }
    }
    
    console.log('🏁 Crawling completed:', results);
    return results;
  }

  // Clean old articles (optional maintenance)
  async cleanOldArticles(daysOld = 30) {
    const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
    
    const result = await News.updateMany(
      { 
        publishedDate: { $lt: cutoffDate },
        status: 'active'
      },
      { 
        status: 'archived'
      }
    );
    
    console.log(`📚 Archived ${result.modifiedCount} old articles`);
    return result;
  }
}

export default NewsScrapingService;