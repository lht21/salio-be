import express from 'express';
import {
    getBankItems,
    createBankItem,
    getBankItemById,
    updateBankItem,
    deleteBankItem
} from '../controllers/questionBankController.js';

import { protect, admin } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);
router.use(admin);

/**
 * @swagger
 * /api/v1/bank/{type}:
 *   get:
 *     summary: Lấy danh sách item trong question bank
 *     description: Chỉ user role admin. type chọn model tương ứng Reading, Listening, Writing, Speaking, Grammar hoặc Vocabulary. Hỗ trợ lọc theo level, difficulty, isActive và tags.
 *     tags: [Question Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [reading, listening, writing, speaking, grammar, vocabulary]
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: tags
 *         description: Nhiều tag cách nhau bằng dấu phẩy
 *         schema:
 *           type: string
 *           example: TOPIK,reading
 *     responses:
 *       200:
 *         description: Trả về success, count và data
 *       400:
 *         description: Type không hợp lệ
 */
router.get('/:type', getBankItems);

/**
 * @swagger
 * /api/v1/bank/{type}:
 *   post:
 *     summary: Tạo item mới trong question bank
 *     description: Chỉ user role admin. Body phụ thuộc type. Với audio/image, upload trước ở /api/v1/upload/audio hoặc /api/v1/upload/image rồi truyền URL trả về vào audioUrl/referenceAudioUrl/attachedImage.
 *     tags: [Question Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [reading, listening, writing, speaking, grammar, vocabulary]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "[1~2] ( )에 들어갈 말로 가장 알맞은 것을 고르십시오."
 *               content:
 *                 type: string
 *                 description: Dùng cho reading
 *                 example: ""
 *               translation:
 *                 type: string
 *                 description: Dùng cho reading
 *                 example: ""
 *               level:
 *                 type: string
 *                 enum: [Sơ cấp 1, Sơ cấp 2, Trung cấp 3, Trung cấp 4, Cao cấp 5, Cao cấp 6]
 *                 example: Trung cấp 3
 *               difficulty:
 *                 type: string
 *                 enum: [Dễ, Trung bình, Khó]
 *                 example: Dễ
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [Đề 96, TOPIK, Điền vào chỗ trống]
 *               audioUrl:
 *                 type: string
 *                 description: Dùng cho listening hoặc question audio; lấy từ /api/v1/upload/audio.
 *               duration:
 *                 type: number
 *                 description: Dùng cho listening
 *               scripts:
 *                 type: array
 *                 items:
 *                   type: object
 *               prompt:
 *                 type: string
 *                 description: Dùng cho writing/speaking
 *               instruction:
 *                 type: string
 *                 description: Dùng cho writing/speaking
 *               attachedImage:
 *                 type: string
 *                 description: Dùng cho writing; lấy từ /api/v1/upload/image.
 *               referenceAudioUrl:
 *                 type: string
 *                 description: Dùng cho speaking shadowing/role-play; lấy từ /api/v1/upload/audio.
 *               wordLimit:
 *                 type: object
 *                 description: Dùng cho writing
 *                 properties:
 *                   min:
 *                     type: number
 *                   max:
 *                     type: number
 *               timeLimit:
 *                 type: number
 *                 description: Dùng cho writing, tính bằng giây
 *               hints:
 *                 type: object
 *                 description: Dùng cho writing
 *               aiConfig:
 *                 type: object
 *                 description: Dùng cho writing
 *               targetVocabularies:
 *                 type: array
 *                 description: Dùng cho speaking
 *                 items:
 *                   type: string
 *               targetGrammar:
 *                 type: array
 *                 description: Dùng cho speaking
 *                 items:
 *                   type: string
 *               sampleAnswer:
 *                 type: string
 *                 description: Dùng cho speaking hoặc writing aiConfig.sampleAnswer
 *               sampleTranslation:
 *                 type: string
 *                 description: Dùng cho speaking
 *               prepTime:
 *                 type: number
 *                 description: Dùng cho speaking, tính bằng giây
 *               recordingLimit:
 *                 type: number
 *                 description: Dùng cho speaking, tính bằng giây
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [type, correctAnswer]
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [single_choice, multiple_choice, true_false, matching, short_answer]
 *                       example: single_choice
 *                     points:
 *                       type: number
 *                       example: 2
 *                     audioUrl:
 *                       type: string
 *                       description: Audio riêng cho câu hỏi nếu có
 *                     scripts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           startTime:
 *                             type: number
 *                           endTime:
 *                             type: number
 *                           korean:
 *                             type: string
 *                           vietnamese:
 *                             type: string
 *                     questionText:
 *                       type: string
 *                       example: 감기약을 (     ) 열이 내렸다.
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         options:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: [먹느라고, 먹더라도, 먹을 텐데, 먹고 나서]
 *                         matchingPairs:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               bottomItem:
 *                                 type: string
 *                               topItem:
 *                                 type: string
 *                         blankCount:
 *                           type: number
 *                     correctAnswer:
 *                       description: String, array hoặc object tùy theo type câu hỏi
 *                       example: 먹고 나서
 *                     explanation:
 *                       type: string
 *                       example: "'감기약을 먹고 나서 열이 내렸다' nghĩa là 'sau khi uống thuốc cảm thì hạ sốt'."
 *           examples:
 *             vocabulary:
 *               summary: Vocabulary bank item - dùng cho quiz từ vựng
 *               value:
 *                 title: Quiz item cho từ 학생
 *                 vocabulary: 69ef1ad4f2a6ec2f593f2eba
 *                 questions:
 *                   - type: single_choice
 *                     points: 1
 *                     questionText: "\"học sinh, sinh viên\" là từ nào trong tiếng Hàn?"
 *                     metadata:
 *                       options: [학생, 선생님, 의사, 회사원]
 *                       matchingPairs: []
 *                     correctAnswer: 학생
 *                   - type: short_answer
 *                     points: 1
 *                     questionText: "Nhập nghĩa tiếng Việt của từ \"학생\"."
 *                     metadata:
 *                       blankCount: 1
 *                     correctAnswer: học sinh, sinh viên
 *                 level: Sơ cấp 1
 *                 difficulty: Dễ
 *                 tags: [Vocabulary, Bài 1]
 *                 isActive: true
 *             grammar:
 *               summary: Grammar bank item - dùng cho quiz ngữ pháp
 *               value:
 *                 title: Quiz item cho ngữ pháp N입니다
 *                 grammar: 69ef1ad4f2a6ec2f593f2eba
 *                 questions:
 *                   - type: single_choice
 *                     points: 1
 *                     questionText: "Câu nào dùng đúng cấu trúc N입니다?"
 *                     metadata:
 *                       options: [저는 학생입니다., 저는 학생입니까?, 저는 학생을., 저는 학생에.]
 *                       matchingPairs: []
 *                     correctAnswer: 저는 학생입니다.
 *                   - type: short_answer
 *                     points: 1
 *                     questionText: "Điền đuôi câu: 저는 학생___."
 *                     metadata:
 *                       blankCount: 1
 *                     correctAnswer: 입니다
 *                 level: Sơ cấp 1
 *                 difficulty: Dễ
 *                 tags: [Grammar, Bài 1]
 *                 isActive: true
 *             reading:
 *               summary: Reading item - nhiều dạng câu hỏi
 *               value:
 *                 title: "[1~2] ( )에 들어갈 말로 가장 알맞은 것을 고르십시오."
 *                 content: ""
 *                 translation: ""
 *                 questions:
 *                   - type: single_choice
 *                     points: 2
 *                     questionText: "감기약을 (     ) 열이 내렸다."
 *                     metadata:
 *                       options: [먹느라고, 먹더라도, 먹을 텐데, 먹고 나서]
 *                       matchingPairs: []
 *                     correctAnswer: 먹고 나서
 *                     explanation: "'감기약을 먹고 나서 열이 내렸다' nghĩa là 'sau khi uống thuốc cảm thì hạ sốt'."
 *                     scripts: []
 *                   - type: true_false
 *                     points: 1
 *                     questionText: "최유진 씨는 한국대학교 학생입니다."
 *                     metadata:
 *                       options: [O, X]
 *                       matchingPairs: []
 *                     correctAnswer: O
 *                     explanation: "Nội dung bài đọc nói 최유진 là sinh viên Đại học Hàn Quốc."
 *                   - type: short_answer
 *                     points: 2
 *                     questionText: "이 사람은 관광 가이드입니까?"
 *                     metadata:
 *                       blankCount: 1
 *                     correctAnswer:
 *                       - 아니요, 중국 공무원입니다
 *                       - 아니요, 공무원이에요
 *                 level: Trung cấp 3
 *                 difficulty: Dễ
 *                 tags: [Đề 96, TOPIK, Reading]
 *                 isActive: true
 *             listening:
 *               summary: Listening item - có audioUrl và scripts
 *               value:
 *                 title: "[9~12] 다음을 듣고 여자가 이어서 할 행동으로 가장 알맞은 것을 고르십시오."
 *                 audioUrl: "https://salio-storage-assets.s3.ap-southeast-1.amazonaws.com/audio/example.mp3"
 *                 duration: 120
 *                 scripts:
 *                   - startTime: 0
 *                     endTime: 3
 *                     korean: "여자: 사과는 다 씻었고, 이제 자르면 되겠다."
 *                     vietnamese: "Nữ: Táo đã rửa xong rồi, giờ chỉ cần cắt thôi."
 *                   - startTime: 3
 *                     endTime: 6
 *                     korean: "남자: 자르는 건 내가 할 테니까 거기 있는 냄비 좀 줄래?"
 *                     vietnamese: "Nam: Việc cắt để anh làm, em đưa anh cái nồi ở đó được không?"
 *                 questions:
 *                   - type: single_choice
 *                     points: 2
 *                     audioUrl: "https://salio-storage-assets.s3.ap-southeast-1.amazonaws.com/audio/example.mp3"
 *                     questionText: ""
 *                     scripts:
 *                       - startTime: 0
 *                         endTime: 3
 *                         korean: "여자: 사과는 다 씻었고, 이제 자르면 되겠다."
 *                         vietnamese: "Nữ: Táo đã rửa xong rồi, giờ chỉ cần cắt thôi."
 *                     metadata:
 *                       options: [사과를 씻는다, 과일을 자른다, 설탕을 가져온다, 냄비를 찾아온다]
 *                       matchingPairs: []
 *                     correctAnswer: 설탕을 가져온다
 *                     explanation: "Người nữ nói cần thêm đường và sẽ đi lấy."
 *                   - type: short_answer
 *                     points: 2
 *                     questionText: "수빈: _____? 박수빈입니다."
 *                     metadata:
 *                       blankCount: 1
 *                     correctAnswer: [안녕하세요, 안녕하십니까]
 *                     explanation: "Có thể dùng lời chào 안녕하세요 hoặc 안녕하십니까."
 *                 level: Sơ cấp 1
 *                 tags: [Listening, Bài 1]
 *                 isActive: true
 *             writing:
 *               summary: Writing item - theo model Writing
 *               value:
 *                 title: "54. 다음을 참고하여 600~700자로 글을 쓰시오."
 *                 type: essay_writing
 *                 prompt: "창의력은 새로운 것을 생각해 내는 능력이다. 아래의 내용을 중심으로 자신의 생각을 쓰시오."
 *                 instruction: "문제를 그대로 옮겨 쓰지 마시오."
 *                 attachedImage: ""
 *                 wordLimit:
 *                   min: 600
 *                   max: 700
 *                 timeLimit: 3000
 *                 hints:
 *                   vocabulary: [창의력, 문제 해결, 아이디어]
 *                   grammar: ["-(으)ㄴ/는 이유는", "-기 때문에", "-는 것이 중요하다"]
 *                   outline: "서론: 주제 소개\n본론: 이유와 방법\n결론: 생각 정리"
 *                 aiConfig:
 *                   sampleAnswer: ""
 *                   focusPoints: ["600~700자 분량 준수", "주제 일관성 유지", "논리적인 문단 구성"]
 *                 level: Trung cấp 4
 *                 tags: [TOPIK II, Câu 54, Writing]
 *                 isActive: true
 *             speaking:
 *               summary: Speaking item - theo model Speaking
 *               value:
 *                 title: "Shadow dialogue - giới thiệu bản thân"
 *                 type: shadowing
 *                 prompt: "Hãy nghe và đọc theo đoạn hội thoại dưới đây."
 *                 instruction: "Nghe mẫu, luyện đọc theo và ghi âm câu trả lời."
 *                 referenceAudioUrl: "https://salio-storage-assets.s3.ap-southeast-1.amazonaws.com/audio/speaking-example.mp3"
 *                 scripts:
 *                   - speaker: man
 *                     korean: "안녕하세요? 저는 박준영입니다."
 *                     vietnamese: "Xin chào? Tôi là Park Jun-young."
 *                     startTime: 0
 *                     endTime: 3
 *                   - speaker: woman
 *                     korean: "안녕하세요? 제 이름은 흐엉입니다."
 *                     vietnamese: "Xin chào? Tên tôi là Hương."
 *                     startTime: 3
 *                     endTime: 6
 *                 targetVocabularies: [학생, 회사원, 의사]
 *                 targetGrammar: ["N입니다", "N입니까?"]
 *                 sampleAnswer: "안녕하세요? 저는 박수빈입니다."
 *                 sampleTranslation: "Xin chào? Tôi là Park Subin."
 *                 prepTime: 60
 *                 recordingLimit: 120
 *                 level: Sơ cấp 1
 *                 tags: [Speaking, Bài 1]
 *                 isActive: true
 *     responses:
 *       201:
 *         description: Tạo item thành công
 *       400:
 *         description: Type hoặc data không hợp lệ
 */
router.post('/:type', createBankItem);

/**
 * @swagger
 * /api/v1/bank/{type}/{itemId}:
 *   get:
 *     summary: Lấy chi tiết một item trong bank
 *     tags: [Question Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [reading, listening, writing, speaking, grammar, vocabulary]
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về data item
 *       400:
 *         description: Type không hợp lệ
 *       404:
 *         description: Không tìm thấy item
 */
router.get('/:type/:itemId', getBankItemById);

/**
 * @swagger
 * /api/v1/bank/{type}/{itemId}:
 *   patch:
 *     summary: Cập nhật item trong bank
 *     description: Nếu audioUrl hoặc attachedImage thay đổi, controller sẽ xóa file cũ trên S3.
 *     tags: [Question Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [reading, listening, writing, speaking, grammar, vocabulary]
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Type hoặc data không hợp lệ
 *       404:
 *         description: Không tìm thấy item
 */
router.patch('/:type/:itemId', updateBankItem);

/**
 * @swagger
 * /api/v1/bank/{type}/{itemId}:
 *   delete:
 *     summary: Xóa item khỏi bank
 *     description: Không cho xóa reading/listening/writing nếu item đang được Exam sử dụng; nếu có audioUrl/attachedImage thì xóa file trên S3.
 *     tags: [Question Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [reading, listening, writing, speaking, grammar, vocabulary]
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       400:
 *         description: Type không hợp lệ hoặc item đang được Exam sử dụng
 *       404:
 *         description: Không tìm thấy item
 */
router.delete('/:type/:itemId', deleteBankItem);

export default router;
