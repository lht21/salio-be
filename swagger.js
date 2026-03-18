import swaggerJsDoc from 'swagger-jsdoc';

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'KOREAN',
      version: '1.0.0',
    //   description: 'Tài liệu API chi tiết cho Backend Node.js',
      contact: {
        name: 'Developer',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Đường dẫn đến các file chứa chú thích Swagger
  // Nó sẽ quét tất cả các file .js trong thư mục routes
  apis: ['./src/routes/*.js'], 
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
export default swaggerDocs;