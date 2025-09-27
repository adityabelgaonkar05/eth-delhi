# CryptoVerse Game with Self Protocol Authentication

A multiplayer blockchain-based game with identity verification using Self Protocol.

## Features

- **Self Protocol Authentication**: Secure identity verification using zero-knowledge proofs
- **Multiplayer Gaming**: Real-time multiplayer game using Socket.IO
- **Blockchain Integration**: Smart contracts on Ethereum/Celo
- **Multiple Game Areas**: Cinema, Library, Townhall, and main game areas

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- ngrok (for development with Self Protocol)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/adityabelgaonkar05/eth-delhi.git
cd eth-delhi
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` with your MongoDB URI:
```env
MONGO_URI=mongodb://localhost:27017/cryptoverse-game
PORT=3001
NODE_ENV=development
SELF_SCOPE=cryptoverse-game
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install --legacy-peer-deps
```

### 4. Self Protocol Setup (Required for Authentication)

Self Protocol requires a public HTTPS endpoint. For development, we use ngrok:

#### Install ngrok:
```bash
npm install -g ngrok
```

#### Start the backend server:
```bash
cd backend
npm start
```

#### In a new terminal, start ngrok tunnel:
```bash
cd backend
npm run tunnel
```

This will output something like:
```
🌐 Ngrok tunnel created: https://abc123.ngrok.io
📝 Update your SELF_ENDPOINT to: https://abc123.ngrok.io/api/auth/verify
```

### 5. Start the Frontend

```bash
cd frontend
npm run dev
```

### 6. Complete Setup

1. Open your browser to `http://localhost:5173`
2. When prompted, enter your ngrok URL (e.g., `https://abc123.ngrok.io`)
3. The system will test the connection and save the configuration

## Self Protocol Configuration

The application is configured to use Self Protocol with the following settings:

- **Minimum Age**: 18 years
- **Excluded Countries**: North Korea, Iran, Syria
- **Required Documents**: Government-issued ID (Passport, ID Card, or Aadhaar)
- **Disclosed Information**: Name, Nationality, Gender

### Verification Requirements

Users must:
- Be 18 years or older
- Have a valid government-issued document
- Not be from restricted countries
- Complete Self Protocol identity verification

## API Endpoints

### Authentication
- `POST /api/auth/verify` - Self Protocol verification endpoint
- `GET /api/auth/status/:userIdentifier` - Check user verification status
- `GET /api/auth/health` - Health check

## Game Features

### Protected Areas
All game areas require Self Protocol authentication:
- **Main Game**: Multiplayer tile-based game
- **Cinema**: Video streaming and events
- **Library**: Educational content
- **Townhall**: Community discussions

### User Data
Verified users get:
- Unique blockchain-style identifier
- Verified nationality and basic profile
- Game progression tracking
- Achievement system

## Development

### Running with Auto-restart
```bash
# Backend with nodemon
cd backend
npm run dev

# Frontend with Vite HMR
cd frontend
npm run dev
```

### Environment Variables

#### Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/cryptoverse-game
PORT=3001
NODE_ENV=development
SELF_SCOPE=cryptoverse-game
SELF_ENDPOINT=https://your-ngrok-url.ngrok.io/api/auth/verify
BACKEND_URL=https://your-ngrok-url.ngrok.io
```

#### Frontend (.env)
```env
VITE_API_URL=https://your-ngrok-url.ngrok.io
VITE_SELF_SCOPE=cryptoverse-game
VITE_SELF_ENDPOINT=https://your-ngrok-url.ngrok.io/api/auth/verify
```

## Troubleshooting

### "localhost endpoints are not allowed" Error
This means Self Protocol cannot reach your localhost endpoint. Make sure:
1. ngrok is running and creating a tunnel
2. Your backend server is running on port 3001
3. You've entered the correct ngrok URL in the frontend setup

### "Failed to connect to backend" Error
Check that:
1. Backend server is running (`npm start` in backend folder)
2. MongoDB is connected
3. ngrok tunnel is active and pointing to port 3001

### Self App Not Found
Download the Self app from your device's app store:
- iOS: Search "Self Sovereign Identity" 
- Android: Search "Self Protocol"

## Production Deployment

For production deployment:

1. Deploy backend to a cloud service (Heroku, Railway, etc.)
2. Update environment variables with production URLs
3. Set `NODE_ENV=production`
4. Use production MongoDB database
5. Configure CORS for your production frontend domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Self Protocol authentication
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For Self Protocol specific issues, visit: https://docs.self.xyz
For game-related issues, create an issue in this repository.
