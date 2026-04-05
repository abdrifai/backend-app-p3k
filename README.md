# Backend App-P3K

Backend for App-P3K application, built with Node.js, Express.js, and Prisma ORM.

## 🚀 Tech Stack

- **Runtime:** Node.js v20 (LTS)
- **Framework:** Express.js
- **ORM:** Prisma ORM
- **Database:** MySQL
- **Validation:** Joi
- **Authentication:** JWT (JSON Web Token) & bcryptjs
- **Logging:** Winston
- **Documentation:** Swagger (OpenAPI 3.0)
- **Testing:** Jest & Supertest

## 📁 Project Structure

The project follows a **Clean Architecture** (Controller, Service, Repository) pattern:

```text
/backend
├── server.js             # Entry Point: Start Server & Listen Port
├── prisma
│   └── schema.prisma     # Database model definitions
├── src
│   ├── app.js           # Express configuration, middleware, and routing
│   ├── api-docs        # Swagger documentation
│   ├── config          # Global configurations (database client, etc.)
│   ├── middlewares     # Global middlewares (error handler, auth, etc.)
│   └── modules         # Business logic modules
│       └── [module]
│           ├── [module].controller.js  # HTTP request handling
│           ├── [module].service.js     # Business logic
│           ├── [module].repository.js  # Database access via Prisma
│           ├── [module].validation.js  # Data validation with Joi
│           └── [module].routes.js      # Endpoint definitions
└── tests               # Unit & Integration tests
```

## 🛠️ Getting Started

### Prerequisites

- Node.js v20+
- MySQL Database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure your environment variables:
   ```bash
   cp .env.example .env
   ```
4. Setup the database and run migrations:
   ```bash
   npx prisma migrate dev
   ```

### Running the Application

- **Development Mode:**
  ```bash
  npm run dev
  ```
- **Production Mode:**
  ```bash
  npm start
  ```

### Running Tests

```bash
npm test
```

## 📖 API Documentation

The API documentation is generated using Swagger and can be accessed at:
`http://localhost:3000/api-docs` (replace `3000` with your configured `PORT`).

## 🔒 Security & Standards

- **Security:** Implements `helmet` for security headers and `cors` for cross-origin resource sharing.
- **Error Handling:** Centralized global error middleware for consistent JSON responses.
- **Validation:** All incoming requests are validated using `Joi` schemas.
- **Database Integrity:** Foreign key constraints and proper indexing are defined in `schema.prisma`.
- **Soft Delete:** Business entities use an `is_deleted` (Boolean) column for logical deletion.

## 📝 Coding Standards

- Use **CamelCase** for variables and functions, **PascalCase** for classes.
- Operations should follow the flow: **Route -> Controller -> Service -> Repository -> Model**.
- Business logic MUST NOT reside in Controllers; use Services instead.
- All database operations MUST go through Prisma repositories.
- Use `asyncHandler` wrapper for consistent error handling in controllers.

## 📄 License

ISC License
