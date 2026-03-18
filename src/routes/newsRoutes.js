import express from 'express';
import {
  getAllNews,
  getNewsById,
  getNewsByCategory,
  getNewsBySource,
  getRecentNews,
  searchNews,
  toggleBookmark,
  updateNews,
  crawlNews,
  getNewsStats,
  getRelatedNews
} from '../controllers/newsController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: News
 *   description: Quản lý tin tức, tìm kiếm và hệ thống thu thập dữ liệu (Crawl)
 */

// --- PUBLIC ROUTES - Không yêu cầu đăng nhập ---

/**
 * @swagger
 * /api/news:
 *   get:
 *     summary: Lấy danh sách tất cả tin tức
 *     tags: [News]
 *     responses:
 *       200:
 *         description: Trả về mảng danh sách tin tức
 */
router.get('/', getAllNews);

/**
 * @swagger
 * /api/news/recent:
 *   get:
 *     summary: Lấy danh sách tin tức mới nhất (Gần đây)
 *     tags: [News]
 *     responses:
 *       200:
 *         description: Danh sách các bản tin mới nhất
 */
router.get('/recent', getRecentNews);

/**
 * @swagger
 * /api/news/search:
 *   get:
 *     summary: Tìm kiếm tin tức theo từ khóa
 *     tags: [News]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm (Ví dụ tên bài báo, nội dung)
 *     responses:
 *       200:
 *         description: Kết quả tìm kiếm phù hợp
 */
router.get('/search', searchNews);

/**
 * @swagger
 * /api/news/stats:
 *   get:
 *     summary: Lấy thống kê về tin tức (Số lượng theo nguồn, danh mục)
 *     tags: [News]
 *     responses:
 *       200:
 *         description: Dữ liệu thống kê tổng quan
 */
router.get('/stats', getNewsStats);

/**
 * @swagger
 * /api/news/category/{category}:
 *   get:
 *     summary: Lấy tin tức theo hạng mục (Category)
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên hạng mục (ví dụ culture, politics...)
 *     responses:
 *       200:
 *         description: Danh sách tin tức thuộc hạng mục đó
 */
router.get('/category/:category', getNewsByCategory);

/**
 * @swagger
 * /api/news/source/{source}:
 *   get:
 *     summary: Lấy tin tức theo nguồn báo (Source)
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên nguồn báo (ví dụ KBS, Naver...)
 *     responses:
 *       200:
 *         description: Danh sách tin tức từ nguồn được chọn
 */
router.get('/source/:source', getNewsBySource);

/**
 * @swagger
 * /api/news/{id}/related:
 *   get:
 *     summary: Lấy danh sách tin tức liên quan đến bài viết hiện tại
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mảng các bài báo liên quan
 */
router.get('/:id/related', getRelatedNews);

/**
 * @swagger
 * /api/news/{id}:
 *   get:
 *     summary: Lấy chi tiết một bài báo theo ID
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin chi tiết của bài báo
 *       404:
 *         description: Không tìm thấy bài báo
 */
router.get('/:id', getNewsById);

// --- PROTECTED ROUTES - Yêu cầu đăng nhập ---

router.use(protect); // Áp dụng bảo mật cho toàn bộ route phía dưới

/**
 * @swagger
 * /api/news/{id}/bookmark:
 *   post:
 *     summary: Lưu hoặc bỏ lưu bài báo (Toggle Bookmark)
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trạng thái Bookmark đã được thay đổi
 */
router.post('/:id/bookmark', toggleBookmark);

/**
 * @swagger
 * /api/news/{id}:
 *   put:
 *     summary: Cập nhật thông tin bài báo
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put('/:id', updateNews);

/**
 * @swagger
 * /api/news/crawl:
 *   post:
 *     summary: Kích hoạt hệ thống cào dữ liệu tin tức mới (Admin Only)
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tiến trình crawl đã được bắt đầu thành công
 */
router.post('/crawl', crawlNews);

export default router;