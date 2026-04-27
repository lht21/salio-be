import FlashcardSet from '../models/FlashcardSet.js';
import UserProgress from '../models/UserProgress.js';
import { ok, created, badRequest, notFound, serverError, forbidden } from '../utils/response.js';

/**
 * GET /api/v1/flashcard-sets
 * Lấy danh sách bộ từ vựng (Query: type = 'my_sets' | 'public')
 */
export const getFlashcardSets = async (req, res) => {
    try {
        const { type } = req.query; // 'public' hoặc 'my_sets'
        const query = {};

        if (type === 'public') {
            query.isPublic = true;
        } else {
            query.owner = req.user._id;
        }

        const sets = await FlashcardSet.find(query)
            .sort({ createdAt: -1 })
            .populate('owner', 'username');

        return ok(res, sets, 'Lấy danh sách bộ Flashcard thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách Flashcard: ' + error.message);
    }
};

/**
 * POST /api/v1/flashcard-sets
 * Tạo bộ từ vựng mới
 */
export const createFlashcardSet = async (req, res) => {
    try {
        const { name, description, isPublic } = req.body;
        if (!name) return badRequest(res, 'Vui lòng cung cấp tên bộ từ vựng');

        const newSet = await FlashcardSet.create({
            name,
            description,
            isPublic: isPublic || false,
            owner: req.user._id,
            cards: []
        });

        return created(res, newSet, 'Tạo bộ Flashcard mới thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi tạo bộ Flashcard: ' + error.message);
    }
};

/**
 * GET /api/v1/flashcard-sets/:id
 * Lấy chi tiết bộ từ vựng. Xử lý đặc biệt nếu id === 'favorite'
 */
export const getFlashcardSetById = async (req, res) => {
    try {
        const { id } = req.params;

        // ĐẶC BIỆT: Xử lý bộ từ vựng Yêu thích
        if (id === 'favorite') {
            const progress = await UserProgress.findOne({ user: req.user._id })
                .populate('statistics.savedVocabularies');
                
            if (!progress) return notFound(res, 'Không tìm thấy dữ liệu học tập');

            // Mock object cho giống hệt FlashcardSet thông thường
            const favoriteSet = {
                _id: 'favorite',
                name: 'Từ vựng yêu thích',
                description: 'Danh sách các từ vựng bạn đã lưu trong quá trình học.',
                isPublic: false,
                owner: req.user._id,
                cards: progress.statistics.savedVocabularies || []
            };
            
            return ok(res, favoriteSet, 'Lấy bộ từ vựng yêu thích thành công');
        }

        // Xử lý bộ Flashcard thông thường
        const set = await FlashcardSet.findById(id).populate('cards');
        if (!set) return notFound(res, 'Không tìm thấy bộ Flashcard');

        // Kiểm tra quyền xem
        const isAdmin = ['admin', 'teacher'].includes(req.user.role);
        if (!set.isPublic && set.owner.toString() !== req.user._id.toString() && !isAdmin) {
            return forbidden(res, 'Bạn không có quyền xem bộ Flashcard này');
        }

        return ok(res, set, 'Lấy chi tiết bộ Flashcard thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy chi tiết Flashcard: ' + error.message);
    }
};

/**
 * PATCH /api/v1/flashcard-sets/:id
 * Cập nhật bộ từ vựng
 */
export const updateFlashcardSet = async (req, res) => {
    try {
        const { id } = req.params;
        if (id === 'favorite') return badRequest(res, 'Không thể đổi tên bộ từ vựng mặc định này');

        const set = await FlashcardSet.findOneAndUpdate(
            { _id: id, owner: req.user._id }, // Ép điều kiện owner để bảo mật
            req.body,
            { returnDocument: 'after', runValidators: true }
        );

        if (!set) return notFound(res, 'Không tìm thấy bộ từ vựng hoặc bạn không có quyền');
        return ok(res, set, 'Cập nhật bộ từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi cập nhật bộ Flashcard: ' + error.message);
    }
};

/**
 * DELETE /api/v1/flashcard-sets/:id
 * Xóa bộ từ vựng
 */
export const deleteFlashcardSet = async (req, res) => {
    try {
        const { id } = req.params;
        if (id === 'favorite') return badRequest(res, 'Không thể xóa bộ từ vựng mặc định này');

        const set = await FlashcardSet.findOneAndDelete({ _id: id, owner: req.user._id });
        if (!set) return notFound(res, 'Không tìm thấy bộ từ vựng hoặc bạn không có quyền');
        
        return ok(res, null, 'Xóa bộ từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi xóa bộ Flashcard: ' + error.message);
    }
};

/**
 * POST /api/v1/flashcard-sets/:id/cards
 * Thêm nhiều từ vựng vào bộ (Hỗ trợ cả 'favorite')
 */
export const addCardsToSet = async (req, res) => {
    try {
        const { id } = req.params;
        const { vocabIds } = req.body; // Mảng các ID từ vựng

        if (!Array.isArray(vocabIds)) return badRequest(res, 'vocabIds phải là một mảng');

        // Xử lý bộ Favorite
        if (id === 'favorite') {
            const progress = await UserProgress.findOne({ user: req.user._id });
            vocabIds.forEach(vid => progress.saveVocabulary(vid));
            await progress.save();
            return ok(res, null, 'Đã lưu các từ vựng vào mục Yêu thích');
        }

        // Xử lý bộ thông thường
        const set = await FlashcardSet.findOne({ _id: id, owner: req.user._id });
        if (!set) return notFound(res, 'Không tìm thấy bộ từ vựng hoặc bạn không có quyền');

        // Chỉ thêm những ID chưa có trong mảng
        vocabIds.forEach(vid => {
            if (!set.cards.includes(vid)) set.cards.push(vid);
        });

        await set.save();
        return ok(res, set, 'Thêm từ vựng vào bộ thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi thêm từ vựng: ' + error.message);
    }
};

/**
 * DELETE /api/v1/flashcard-sets/:id/cards/:vocabId
 * Xóa 1 từ vựng khỏi bộ (Hỗ trợ cả 'favorite')
 */
export const removeCardFromSet = async (req, res) => {
    try {
        const { id, vocabId } = req.params;

        // Xử lý bộ Favorite
        if (id === 'favorite') {
            const progress = await UserProgress.findOne({ user: req.user._id });
            progress.unsaveVocabulary(vocabId);
            await progress.save();
            return ok(res, null, 'Đã xóa từ vựng khỏi mục Yêu thích');
        }

        // Xử lý bộ thông thường
        const set = await FlashcardSet.findOne({ _id: id, owner: req.user._id });
        if (!set) return notFound(res, 'Không tìm thấy bộ từ vựng hoặc bạn không có quyền');

        set.cards = set.cards.filter(card => card.toString() !== vocabId);
        await set.save();
        
        return ok(res, set, 'Xóa từ vựng khỏi bộ thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi xóa từ vựng: ' + error.message);
    }
};