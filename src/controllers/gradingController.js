import { GoogleGenerativeAI } from '@google/generative-ai';

// Hàm hỗ trợ gọi API có cơ chế tự động thử lại (Retry with Exponential Backoff)
const generateWithRetry = async (model, prompt, maxRetries = 3, delayMs = 2000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await model.generateContent(prompt);
        } catch (error) {
            // Nếu lỗi 503 (quá tải) và chưa vượt quá số lần thử
            if (error.status === 503 && i < maxRetries - 1) {
                console.warn(`[Gemini AI] Lỗi 503 - Đang quá tải. Thử lại lần ${i + 1}/${maxRetries - 1} sau ${delayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                delayMs *= 2; // Tăng gấp đôi thời gian chờ cho lần sau
            } else {
                throw error; // Ném lỗi ra ngoài nếu không phải 503 hoặc đã hết lượt thử
            }
        }
    }
};

export const gradeWritingTOPIK = async (req, res) => {
    try {
        const { topicTitle, topicDescription, userText } = req.body;

        if (!userText || userText.trim() === '') {
            return res.status(400).json({ message: 'Bài viết không được để trống.' });
        }

        // Khởi tạo 
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Khuyên dùng gemini-1.5-flash (ổn định) hoặc gemini-2.0-flash
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // promt
        const prompt = `
        Bạn là một giám khảo chấm thi TOPIK II tiếng Hàn xuất sắc.
        Hãy chấm điểm bài viết sau đây của học viên (Thang điểm tối đa 50).
        
        Đề bài: ${topicTitle} - ${topicDescription}
        Bài làm của học viên: "${userText}"

        Yêu cầu BẮT BUỘC: Trả về kết quả CHỈ bằng định dạng JSON (không có markdown \`\`\`json ở đầu/cuối), với cấu trúc chính xác như sau:
        {
            "score": [Điểm số, là một số nguyên từ 0 đến 50],
            "feedback": [
                { "title": "Nội dung", "content": "[Nhận xét về việc trả lời đúng trọng tâm câu hỏi, ý tưởng phát triển]" },
                { "title": "Từ vựng", "content": "[Nhận xét về vốn từ, lỗi chính tả]" },
                { "title": "Ngữ pháp", "content": "[Nhận xét về cấu trúc ngữ pháp sử dụng, lỗi sai]" },
                { "title": "Độ mạch lạc", "content": "[Nhận xét về tính liên kết, từ nối]" }
            ],
            "detailedCorrection": [
                // Phân tích toàn bộ bài viết của học viên thành các đoạn nhỏ để hiển thị giao diện sửa lỗi.
                // Phân loại "type" thành: "text" (bình thường), "error" (từ viết sai), "correct" (từ sửa lại).
                // Ví dụ, học viên viết "우리는 환경을 보호하다 노력해야 합니다", sai từ "보호하다", sửa thành "보호하기 위해".
                // Output BẮT BUỘC có dạng:
                // { "type": "text", "content": "우리는 환경을 " },
                // { "type": "error", "content": "보호하다" },
                // { "type": "correct", "content": " 보호하기 위해" },
                // { "type": "text", "content": " 노력해야 합니다." }
                // Lưu ý: Đảm bảo giữ nguyên các khoảng trắng (dấu cách) ở đầu/cuối chuỗi để khi ghép lại thành câu không bị dính chữ.
                // Nếu bài làm không có lỗi nào, hãy trả về 1 object duy nhất với type "text" chứa toàn bộ bài viết.
            ]
        }
        Nhận xét phải viết bằng tiếng Việt, ngắn gọn, súc tích (khoảng 2-3 câu mỗi mục).
        `;

        const result = await generateWithRetry(model, prompt);
        const responseText = result.response.text();
        
        // Xử lý chuỗi trả về để đảm bảo nó là JSON hợp lệ (phòng trường hợp AI vẫn chèn markdown)
        let cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const gradingResult = JSON.parse(cleanJsonStr);

        return res.status(200).json({
            success: true,
            data: gradingResult
        });

    } catch (error) {
        console.error('Lỗi khi chấm bài bằng Gemini AI:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Đã có lỗi xảy ra trong quá trình chấm bài bằng AI.',
            error: error.message 
        });
    }
};

// Hàm lấy danh sách các model khả dụng cho API Key hiện tại
export const getAvailableModels = async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        // Gọi trực tiếp vào REST API của Google để lấy danh sách Model
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};