# anon-chat

## Overview
The anon-chat project is a real-time chat application that utilizes WebSocket for communication between clients and a serverless backend. The application is structured into two main parts: the backend and the frontend.

## Project Structure
```
anon-chat
├── backend
│   ├── serverless.yml
│   ├── package.json
│   ├── src
│   │   ├── wsConnect.js
│   │   ├── wsDisconnect.js
│   │   ├── wsDefault.js
│   │   ├── getUploadUrl.js
│   │   └── utils.js
│   └── README.md
├── frontend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── .env.example
│   └── src
│       ├── main.jsx
│       ├── App.jsx
│       └── styles.css
└── README.md
```

## Backend
The backend is built using a serverless framework, which allows for easy deployment and scaling. It includes:
- **WebSocket Handlers**: Functions to manage WebSocket connections, disconnections, and default events.
- **File Uploads**: Functionality to generate pre-signed URLs for secure file uploads.
- **Utilities**: Helper functions for various backend operations.

### Setup Instructions
1. Navigate to the `backend` directory.
2. Install dependencies using `npm install`.
3. Deploy the backend using the serverless framework.

## Frontend
The frontend is a React application that provides the user interface for the chat application. It includes:
- **Main HTML File**: Entry point for the web application.
- **React Components**: Main application logic and structure.
- **Styling**: Global styles and Tailwind CSS for responsive design.

### Setup Instructions
1. Navigate to the `frontend` directory.
2. Install dependencies using `npm install`.
3. Start the development server using `npm run dev`.

## Contributing
Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.