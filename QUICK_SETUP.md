# Quick Setup Guide for Self Authentication

## 🚀 Getting Started

Your CryptoVerse game is now equipped with Self Protocol authentication! Follow these steps to get it running:

### Step 1: Start Your Backend Server
```bash
cd backend
npm start
```
✅ Your server should be running on http://localhost:3001

### Step 2: Expose Your Backend to the Internet

Since Self Protocol needs to reach your backend, you need to create a tunnel:

#### Option A: Using Localtunnel (Easiest)
```bash
# In a new terminal, in the backend folder:
npm install localtunnel
npx localtunnel --port 3001
```

#### Option B: Using Ngrok (More Reliable)
1. Install ngrok from https://ngrok.com/download
2. Sign up for a free account and get your auth token
3. Run: `ngrok config add-authtoken YOUR_AUTH_TOKEN`
4. Run: `ngrok http 3001`

### Step 3: Start Your Frontend
```bash
cd frontend
npm run dev
```

### Step 4: Configure the Tunnel URL
1. Visit http://localhost:5173
2. Try to access any protected route (like `/game`)
3. The app will ask you to enter your tunnel URL
4. Enter the HTTPS URL from step 2 (e.g., `https://abc123.ngrok.io`)
5. Click "Continue with this URL"

### Step 5: Test Authentication
1. You'll see a QR code
2. Download the Self app on your phone (iOS/Android)
3. Scan the QR code with the Self app
4. Complete identity verification
5. You're now authenticated and can access the game!

## 🔧 Troubleshooting

### "Tunnel URL not working"
- Make sure your backend server is running
- Verify the tunnel URL is accessible in your browser: `https://your-tunnel-url.com/api/auth/health`

### "QR Code not appearing"
- Check browser console for errors
- Ensure all dependencies are installed
- Try refreshing the page

### "Verification failing"
- Make sure you're using a valid government ID
- Check that you meet the age requirement (18+)
- Ensure you're not from a blocked country

## 🌟 Features

- ✅ Zero-knowledge identity verification
- ✅ Age verification (18+)
- ✅ Geographic compliance
- ✅ Privacy-preserving authentication
- ✅ Secure user sessions

## 📱 Self App Download

Download the Self mobile app:
- iOS: App Store → Search "Self"
- Android: Google Play Store → Search "Self"

## 🆘 Need Help?

1. Check the console logs in both frontend and backend
2. Visit the Self Protocol documentation: https://docs.self.xyz
3. Join the Self Discord community for support

---

**Ready to play?** 🎮 Once authenticated, you can access all game areas: Cinema, Library, Townhall, and the main game world!