import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'App-P3K API Documentation',
      version: '1.0.0',
      description: 'API documentation for App-P3K backend built with Express and Prisma',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development Server',
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
  apis: ['./src/modules/**/*.routes.js', './src/modules/**/*.controller.js', './src/modules/**/*.swagger.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
