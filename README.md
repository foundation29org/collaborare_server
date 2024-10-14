# CollaboRARE Server

CollaboRARE is a collaborative platform designed to facilitate the sharing and management of information about rare diseases. This repository contains the backend server code for the CollaboRARE project.

## Project Overview

CollaboRARE is a web application that allows medical professionals and researchers to collaborate on identifying and managing key aspects of rare diseases. The server provides a RESTful API that supports various functionalities such as user authentication, disease management, and collaborative features.

## Key Features

- User authentication and authorization
- CRUD operations for rare diseases
- Support system for users
- Email notifications
- Integration with AI services for disease information generation
- Secure API key validation

## Technology Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JSON Web Tokens (JWT) for authentication
- Nodemailer for email services
- Azure Application Insights for monitoring
- OpenAI integration for content generation

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `config.js.sample`)
4. Run the server:
   - For development: `npm run servedev`
   - For production: `npm start`

## API Documentation

API documentation is available at `/apidoc` when the server is running.

## Project Structure

- `controllers/`: Contains logic for handling API requests
- `models/`: Defines MongoDB schemas
- `routes/`: Defines API routes
- `services/`: Contains utility services (email, authentication, etc.)
- `middlewares/`: Custom middleware functions
- `views/`: Email templates

## Security

- API key validation for sensitive routes
- JWT-based authentication
- Role-based access control

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License.

## Support

For support, please email support@foundation29.org or use the in-app support feature.

## Acknowledgements

- EURORDIS
- European Medicines Agency (EMA)
- Foundation 29

