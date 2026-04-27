import Vocabulary from '../models/Vocabulary.js';
import FlashcardSet from '../models/FlashcardSet.js';
import UserProgress from '../models/UserProgress.js';
import { ok, created, badRequest, notFound, serverError, conflict } from '../utils/response.js';
import xlsx from 'xlsx';
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../middlewares/upload.js";

/**
 * GET /api/v1/vocabularies
 * Lấy danh sách từ vựng (Có phân trang, filter level, category, keyword)
 */
export const getVocabularies = async (req, res) => {
    try {
        const { page = 1, limit = 20, level, category, search, isActive } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const query = {};

        if (level) query.level = level;
        if (category) query.category = category;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        
        // Tìm kiếm theo từ khóa (word) hoặc nghĩa (meaning)
        if (search) {
            query.$or = [
                { word: { $regex: search, $options: 'i' } },
                { meaning: { $regex: search, $options: 'i' } }
            ];
        }

        const vocabularies = await Vocabulary.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Vocabulary.countDocuments(query);

        return ok(res, {
            vocabularies,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        }, 'Lấy danh sách từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách từ vựng: ' + error.message);
    }
};

/**
 * POST /api/v1/vocabularies
 * Thêm từ vựng mới vào kho
 */
export const createVocabulary = async (req, res) => {
    try {
        const { word, meaning } = req.body;
        if (!word || !meaning) {
            return badRequest(res, 'Vui lòng cung cấp từ vựng và nghĩa');
        }

        // Kiểm tra từ vựng đã tồn tại chưa (dựa trên trường 'word')
        const existingVocab = await Vocabulary.findOne({ word: word.trim() });
        if (existingVocab) {
            return conflict(res, `Từ vựng "${word}" đã tồn tại trong hệ thống.`);
        }

        const newVocab = await Vocabulary.create(req.body);
        return created(res, newVocab, 'Thêm từ vựng mới thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi thêm từ vựng: ' + error.message);
    }
};

/**
 * GET /api/v1/vocabularies/:id
 * Xem chi tiết một từ vựng
 */
export const getVocabularyById = async (req, res) => {
    try {
        const vocab = await Vocabulary.findById(req.params.id);
        if (!vocab) return notFound(res, 'Không tìm thấy từ vựng');

        return ok(res, vocab, 'Lấy chi tiết từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy chi tiết từ vựng: ' + error.message);
    }
};

/**
 * PATCH /api/v1/vocabularies/:id
 * Cập nhật thông tin từ vựng
 */
export const updateVocabulary = async (req, res) => {
    try {
        const { id } = req.params;
        const oldVocab = await Vocabulary.findById(id);
        
        if (!oldVocab) return notFound(res, 'Không tìm thấy từ vựng để cập nhật');

        // Xóa file ảnh cũ trên S3 nếu có cập nhật đường dẫn ảnh mới (hoặc xóa ảnh)
        if (req.body.imageUrl !== undefined && req.body.imageUrl !== oldVocab.imageUrl) {
            if (oldVocab.imageUrl) {
                try {
                    const parsedUrl = new URL(oldVocab.imageUrl);
                    const key = decodeURIComponent(parsedUrl.pathname.substring(1));
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_S3_BUCKET_NAME,
                        Key: key
                    }));
                } catch (s3Err) {
                    console.error('Lỗi khi xóa ảnh cũ trên S3:', s3Err);
                }
            }
        }

        const updatedVocab = await Vocabulary.findByIdAndUpdate(
            id,
            req.body,
            { returnDocument: 'after', runValidators: true }
        );

        return ok(res, updatedVocab, 'Cập nhật từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi cập nhật từ vựng: ' + error.message);
    }
};

/**
 * PATCH /api/v1/vocabularies/:id/publish
 * Ẩn/Hiện từ vựng (Draft/Published)
 */
export const togglePublishVocabulary = async (req, res) => {
    try {
        const vocab = await Vocabulary.findById(req.params.id);
        if (!vocab) return notFound(res, 'Không tìm thấy từ vựng');

        vocab.isActive = !vocab.isActive;
        await vocab.save();

        const msg = vocab.isActive ? 'Đã hiển thị từ vựng' : 'Đã ẩn từ vựng';
        return ok(res, vocab, msg);
    } catch (error) {
        return serverError(res, 'Lỗi khi thay đổi trạng thái từ vựng: ' + error.message);
    }
};

/**
 * PATCH /api/v1/vocabularies/bulk-images
 * Cập nhật ảnh hàng loạt cho các từ vựng đã có
 */
export const updateBulkImages = async (req, res) => {
    try {
        const { updates } = req.body;
        
        if (!Array.isArray(updates) || updates.length === 0) {
            return badRequest(res, 'Vui lòng cung cấp danh sách dữ liệu cập nhật (mảng updates)');
        }

        let successCount = 0;

        for (const item of updates) {
            const { id, imageUrl } = item;
            if (!id || imageUrl === undefined) continue;

            const vocab = await Vocabulary.findById(id);
            if (!vocab) continue;

            // Xóa ảnh cũ trên S3 nếu bị ghi đè bằng ảnh mới
            if (vocab.imageUrl && vocab.imageUrl !== imageUrl) {
                try {
                    const parsedUrl = new URL(vocab.imageUrl);
                    const key = decodeURIComponent(parsedUrl.pathname.substring(1));
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_S3_BUCKET_NAME,
                        Key: key
                    }));
                } catch (s3Err) {
                    console.error('Lỗi khi xóa ảnh cũ trên S3:', s3Err);
                }
            }

            vocab.imageUrl = imageUrl;
            await vocab.save();
            successCount++;
        }

        return ok(res, { successCount }, `Đã cập nhật ảnh thành công cho ${successCount} từ vựng`);
    } catch (error) {
        return serverError(res, 'Lỗi khi cập nhật ảnh hàng loạt: ' + error.message);
    }
};

/**
 * DELETE /api/v1/vocabularies/:id
 * Xóa từ vựng (Có kiểm tra ràng buộc với FlashcardSet & Danh sách yêu thích)
 */
export const deleteVocabulary = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Kiểm tra xem có bộ Flashcard nào đang chứa từ này không
        const flashcardSetUsingIt = await FlashcardSet.findOne({ cards: id });
        if (flashcardSetUsingIt) {
            return badRequest(res, `Không thể xóa! Từ vựng này đang nằm trong bộ Flashcard: "${flashcardSetUsingIt.name}"`);
        }

        // 2. Kiểm tra xem có học viên nào đang lưu từ này vào mục Yêu thích không
        const userProgressUsingIt = await UserProgress.findOne({ 'statistics.savedVocabularies': id });
        if (userProgressUsingIt) {
            return badRequest(res, 'Không thể xóa! Từ vựng này đang có học viên lưu trong danh sách Yêu thích.');
        }

        const deletedVocab = await Vocabulary.findByIdAndDelete(id);
        if (!deletedVocab) return notFound(res, 'Không tìm thấy từ vựng để xóa');

        // Xóa file ảnh trên S3 nếu từ vựng đó có ảnh đính kèm
        if (deletedVocab.imageUrl) {
            try {
                const parsedUrl = new URL(deletedVocab.imageUrl);
                const key = decodeURIComponent(parsedUrl.pathname.substring(1));
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: key
                }));
            } catch (s3Err) {
                console.error('Lỗi khi xóa ảnh trên S3:', s3Err);
            }
        }

        return ok(res, null, 'Xóa từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi xóa từ vựng: ' + error.message);
    }
};

/**
 * POST /api/v1/vocabularies/import
 * Import hàng loạt từ vựng từ file Excel
 */
export const importVocabularies = async (req, res) => {
    try {
        if (!req.file) {
            return badRequest(res, 'Vui lòng tải lên một file Excel (.xlsx, .xls)');
        }

        // 1. Đọc file từ buffer bằng thư viện xlsx (SheetJS)
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        
        // 2. Lấy dữ liệu từ Sheet đầu tiên
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 3. Chuyển đổi thành mảng JSON
        const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawData || rawData.length === 0) {
            return badRequest(res, 'File Excel không có dữ liệu hoặc sai định dạng');
        }

        // --- LOGIC CHỐNG TRÙNG LẶP ---
        // Lấy danh sách tất cả các 'word' từ file Excel
        const wordsFromExcel = [...new Set(
            rawData.map(row => (row['Từ vựng'] || row['word'])?.toString().trim()).filter(Boolean)
        )];

        // Tìm tất cả các từ đã tồn tại trong DB chỉ với 1 query
        const existingDocs = await Vocabulary.find({ word: { $in: wordsFromExcel } }).select('word');
        const existingWords = new Set(existingDocs.map(v => v.word));

        // Lọc ra những dòng dữ liệu chưa có trong DB
        const dataToInsert = rawData.filter(row => {
            const word = (row['Từ vựng'] || row['word'])?.toString().trim();
            return word && !existingWords.has(word);
        });

        const skippedCount = rawData.length - dataToInsert.length;

        if (dataToInsert.length === 0) {
            return ok(res, { importedCount: 0, skippedCount }, `Đã bỏ qua ${skippedCount} từ vựng do đã tồn tại. Không có từ vựng mới nào được thêm.`);
        }

        // Hàm hỗ trợ chuyển đổi Loại từ tiếng Việt (trong file Excel) sang Enum chuẩn của Database
        const mapWordType = (val) => {
            if (!val) return 'noun';
            const str = val.toString().trim().toLowerCase();
            if (str.includes('động') || str === 'verb') return 'verb';
            if (str.includes('tính') || str === 'adjective') return 'adjective';
            if (str.includes('phó') || str.includes('trạng') || str === 'adverb') return 'adverb';
            return 'noun'; // Mặc định là danh từ
        };

        // 4. Map dữ liệu từ file Excel sang schema Vocabulary
        // Cấu trúc File Excel đầy đủ sẽ bao gồm các cột sau:
        // "Từ vựng", "Nghĩa", "Phát âm", "Loại từ", "Cấp độ", "Chủ đề", "Từ Hán Hàn", "Chữ Hán", "Âm Hán Việt", "Hình ảnh", "Ví dụ Hàn", "Ví dụ Việt"
        const vocabularies = dataToInsert.map(row => {
            // Kiểm tra flag Từ Hán Hàn (chấp nhận "có", "true", "1", "x")
            const isSinoVal = row['Từ Hán Hàn']?.toString().trim().toLowerCase();
            const isSinoKorean = ['true', '1', 'yes', 'có', 'x'].includes(isSinoVal);

            // --- XỬ LÝ NHIỀU VÍ DỤ ---
            const examples = [];
            
            // Cách 1: Hỗ trợ xuống dòng (Alt+Enter) trong cùng 1 ô "Ví dụ Hàn" / "Ví dụ Việt"
            if (row['Ví dụ Hàn'] && row['Ví dụ Việt']) {
                const koLines = row['Ví dụ Hàn'].toString().split('\n');
                const viLines = row['Ví dụ Việt'].toString().split('\n');
                const maxLen = Math.min(koLines.length, viLines.length);
                for (let i = 0; i < maxLen; i++) {
                    const k = koLines[i].trim();
                    const v = viLines[i].trim();
                    if (k && v) examples.push({ korean: k, vietnamese: v });
                }
            }

            // Cách 2: Hỗ trợ tạo thêm các cột đánh số (Ví dụ Hàn 1, Ví dụ Việt 1, Ví dụ Hàn 2...)
            for (let i = 1; i <= 5; i++) { // Hỗ trợ tối đa 5 ví dụ chia cột
                const k = row[`Ví dụ Hàn ${i}`]?.toString().trim();
                const v = row[`Ví dụ Việt ${i}`]?.toString().trim();
                if (k && v) {
                    examples.push({ korean: k, vietnamese: v });
                }
            }

            return {
                word: row['Từ vựng']?.toString().trim() || row['word'],
                meaning: row['Nghĩa']?.toString().trim() || row['meaning'],
                pronunciationText: row['Phát âm']?.toString().trim() || row['pronunciationText'],
                type: mapWordType(row['Loại từ'] || row['type']),
                isSinoKorean: isSinoKorean,
                hanja: row['Chữ Hán']?.toString().trim() || row['hanja'],
                sinoVietnamese: row['Âm Hán Việt']?.toString().trim() || row['sinoVietnamese'],
                imageUrl: row['Hình ảnh']?.toString().trim() || row['imageUrl'],
                level: row['Cấp độ']?.toString().trim() || row['level'] || 'Sơ cấp 1',
                category: row['Chủ đề']?.toString().trim() || row['category'],
                examples: examples
            };
        }).filter(vocab => vocab.word && vocab.meaning); // Bỏ qua các dòng trống không có từ và nghĩa

        // Sử dụng ordered: false để nếu có 1 vài record lỗi (VD: thiếu trường required)
        // thì các record đúng vẫn được insert bình thường thay vì crash toàn bộ
        const result = await Vocabulary.insertMany(vocabularies, { ordered: false });

        return created(res, { importedCount: result.length, skippedCount }, `Đã import thành công ${result.length} từ vựng. Bỏ qua ${skippedCount} từ đã tồn tại.`);
    } catch (error) {
        // Bắt lỗi BulkWriteError nếu có
        if (error.name === 'BulkWriteError') {
            return serverError(res, `Đã import được ${error.insertedDocs.length} từ vựng. Có lỗi ở một số bản ghi.`);
        }
        return serverError(res, 'Lỗi khi import từ vựng: ' + error.message);
    }
};