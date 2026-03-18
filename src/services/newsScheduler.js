import cron from 'node-cron';
import NewsScrapingService from '../services/newsScrapingService.js';

const newsScrapingService = new NewsScrapingService();

class NewsScheduler {
  constructor() {
    this.jobs = [];
  }

  // Start all scheduled tasks
  startScheduler() {
    console.log('📅 Starting news scheduler...');
    
    // Schedule news crawling every 2 hours
    const crawlJob = cron.schedule('0 */2 * * *', async () => {
      console.log('⏰ Scheduled news crawling started...');
      try {
        const results = await newsScrapingService.crawlAllNews();
        console.log('✅ Scheduled crawling completed:', results);
      } catch (error) {
        console.error('❌ Scheduled crawling failed:', error);
      }
    }, {
      scheduled: false,
      timezone: "Asia/Seoul"
    });

    // Schedule maintenance (archive old articles) daily at 2 AM
    const maintenanceJob = cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Starting daily maintenance...');
      try {
        await newsScrapingService.cleanOldArticles(30); // Archive articles older than 30 days
        console.log('✅ Daily maintenance completed');
      } catch (error) {
        console.error('❌ Daily maintenance failed:', error);
      }
    }, {
      scheduled: false,
      timezone: "Asia/Seoul"
    });

    // Start jobs
    crawlJob.start();
    maintenanceJob.start();

    this.jobs.push(crawlJob, maintenanceJob);
    
    console.log('✅ News scheduler started successfully');
    console.log('📰 News will be crawled every 2 hours');
    console.log('🧹 Maintenance runs daily at 2 AM KST');
  }

  // Stop all scheduled tasks
  stopScheduler() {
    console.log('⏹️ Stopping news scheduler...');
    this.jobs.forEach(job => job.destroy());
    this.jobs = [];
    console.log('✅ News scheduler stopped');
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.jobs.length > 0,
      activeJobs: this.jobs.length,
      timezone: 'Asia/Seoul',
      crawlSchedule: 'Every 2 hours',
      maintenanceSchedule: 'Daily at 2 AM KST'
    };
  }

  // Run immediate crawl (for testing or manual trigger)
  async runImmediateCrawl() {
    console.log('🚀 Running immediate news crawl...');
    try {
      const results = await newsScrapingService.crawlAllNews();
      console.log('✅ Immediate crawl completed:', results);
      return results;
    } catch (error) {
      console.error('❌ Immediate crawl failed:', error);
      throw error;
    }
  }
}

export default NewsScheduler;