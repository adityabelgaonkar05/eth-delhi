# CryptoVerse Game - Self Authentication Integration

This project integrates Self Protocol's zero-knowledge identity verification into the CryptoVerse multiplayer game, ensuring all players are verified users while maintaining privacy.

## Features

- 🔐 **Zero-Knowledge Identity Verification** using Self Protocol
- 🎮 **Protected Game Access** - only verified users can play
- 🌍 **Global Compliance** - age verification and geo-blocking
- 🚫 **Privacy-First** - no personal data stored, only verification status
- 🏆 **Verified Player Profiles** with nationality and verification status

## Self Authentication Setup

### Backend Setup

1. **Install dependencies:**
```bash
cd backend
npm install @selfxyz/core body-parser
```

2. **Environment Configuration:**
Copy `.env.example` to `.env` and configure:
```env
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/cryptoverse-game

# Server Configuration
PORT=3001
NODE_ENV=development

# Self Protocol Configuration
SELF_SCOPE=cryptoverse-game
SELF_ENDPOINT=http://localhost:3001/api/auth/verify
BACKEND_URL=http://localhost:3001
```

3. **Start the backend server:**
```bash
npm run dev
```

### Frontend Setup

1. **Install dependencies:**
```bash
cd frontend
npm install @selfxyz/qrcode --legacy-peer-deps
```

2. **Environment Configuration:**
Copy `.env.example` to `.env`:
```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:5173

# Self Protocol Configuration
VITE_SELF_SCOPE=cryptoverse-game
VITE_SELF_ENDPOINT=http://localhost:3001/api/auth/verify
```

3. **Start the frontend:**
```bash
npm run dev
```

## How Self Authentication Works

### 1. User Flow
1. User tries to access protected game routes (`/game`, `/cinema`, `/library`, `/townhall`)
2. If not verified, user sees Self QR code authentication screen
3. User scans QR code with Self mobile app
4. Self app verifies user's government ID using zero-knowledge proofs
5. Verification result is sent to our backend API
6. Upon successful verification, user gains access to the game

### 2. Verification Requirements
- **Minimum Age:** 18 years
- **Blocked Countries:** North Korea, Iran, Syria
- **Document Types:** Passport, National ID, or Aadhaar
- **Data Disclosed:** Nationality, Gender, Name (optional)

### 3. Technical Implementation

#### Backend Components
- **`/routes/auth/selfAuth.js`** - Main verification endpoint
- **`/models/User.js`** - User data model with verification status
- **`/routes/auth/admin.js`** - Admin endpoints for user statistics

#### Frontend Components
- **`SelfAuthentication.jsx`** - QR code component for verification
- **`AuthContext.jsx`** - Global authentication state management
- **`ProtectedRoute.jsx`** - Wrapper for authenticated-only routes

### 4. API Endpoints

#### Authentication Endpoints
```
POST /api/auth/verify
- Verifies Self identity proof
- Called automatically by Self's relayers

GET /api/auth/status/:userIdentifier
- Check user verification status
- Returns user data if verified

GET /api/auth/health
- Service health check
```

#### Admin Endpoints
```
GET /api/admin/users
- List all verified users

GET /api/admin/stats
- Get verification statistics and analytics
```

## Development Setup

### Prerequisites
- Node.js 16+ 
- MongoDB (local or cloud)
- Self mobile app (for testing)

### Quick Start
1. Clone the repository
2. Set up MongoDB database
3. Configure environment variables (copy from `.env.example`)
4. Install and run backend: `cd backend && npm install && npm run dev`
5. Install and run frontend: `cd frontend && npm install && npm run dev`
6. Access the game at `http://localhost:5173`

### Testing Authentication
1. Navigate to any protected route (e.g., `/game`)
2. Scan the QR code with Self app
3. Complete identity verification
4. Access granted to all game features

## Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Update `SELF_ENDPOINT` to your production domain
3. Ensure SSL/HTTPS is configured
4. Set up proper MongoDB connection

### Frontend
1. Update `VITE_API_URL` to production backend URL
2. Update `VITE_SELF_ENDPOINT` to production verification endpoint
3. Build and deploy: `npm run build`

## Security Considerations

- **Zero-Knowledge Proofs:** No personal data is transmitted or stored
- **Blockchain Verification:** All proofs are verified against on-chain contracts
- **Compliance:** Built-in age verification and geo-blocking
- **Privacy:** Only verification status and minimal disclosed data stored

## Troubleshooting

### Common Issues

1. **QR Code not loading:**
   - Check backend is running on correct port
   - Verify environment variables are set
   - Ensure CORS is configured properly

2. **Verification failing:**
   - Check Self app is updated
   - Verify backend endpoint is accessible
   - Review server logs for detailed errors

3. **Database connection issues:**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify database permissions

### Development Tools

- View authentication logs: Check backend console
- Test API endpoints: Use `/api/auth/health`
- View user stats: Access `/api/admin/stats`
- Debug QR codes: Enable browser developer tools

## Support

For Self Protocol integration issues:
- [Self Protocol Documentation](https://docs.self.xyz)
- [Self Protocol Discord](https://discord.gg/self)

For game-specific issues:
- Check the project's GitHub issues
- Review server logs for detailed error messages