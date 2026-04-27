import swaggerJsDoc from 'swagger-jsdoc';

const port = process.env.PORT || 5000;

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Salio Backend API',
      version: '1.0.0',
      description: 'Tài liệu Swagger cho các API backend của Salio.',
      contact: {
        name: 'Salio Developer',
      },
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Local server',
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Các endpoint xác thực người dùng',
      },
      { name: 'Users', description: 'Quản lý tài khoản và hồ sơ người dùng' },
      { name: 'Question Bank', description: 'Quản lý ngân hàng câu hỏi' },
      { name: 'Uploads', description: 'Tải file lên S3' },
      { name: 'Exams', description: 'Quản lý đề thi' },
      { name: 'Practice', description: 'Danh sách bài luyện tập và lịch sử làm bài' },
      { name: 'Attempts', description: 'Theo dõi, lưu đáp án, nộp bài và xem kết quả' },
      { name: 'Placement Test', description: 'Bài quiz đầu vào' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Thao tác thành công',
            },
            data: {
              type: 'object',
              nullable: true,
            },
          },
        },
        EmailOtpRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@gmail.com',
            },
          },
        },
        VerifyOtpRequest: {
          type: 'object',
          required: ['email', 'code'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@gmail.com',
            },
            code: {
              type: 'string',
              example: '123456',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'username', 'password', 'confirmPassword'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@gmail.com',
            },
            username: {
              type: 'string',
              example: 'salio_user',
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'StrongPassword123',
            },
            confirmPassword: {
              type: 'string',
              format: 'password',
              example: 'StrongPassword123',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@gmail.com',
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'StrongPassword123',
            },
          },
        },
        SocialLoginRequest: {
          type: 'object',
          required: ['provider', 'idToken'],
          properties: {
            provider: {
              type: 'string',
              enum: ['google', 'apple'],
              example: 'google',
            },
            idToken: {
              type: 'string',
              example: 'eyJhbGciOi...',
            },
            fullName: {
              type: 'string',
              example: 'Nguyen Van A',
            },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['email', 'code', 'newPassword', 'confirmNewPassword'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@gmail.com',
            },
            code: {
              type: 'string',
              example: '123456',
            },
            newPassword: {
              type: 'string',
              format: 'password',
              example: 'NewStrongPassword123',
            },
            confirmNewPassword: {
              type: 'string',
              format: 'password',
              example: 'NewStrongPassword123',
            },
          },
        },
        RefreshTokenRequest: {
          type: 'object',
          properties: {
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOi...',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

export default swaggerDocs;
