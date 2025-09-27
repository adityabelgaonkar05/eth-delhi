console.log('🔧 Ngrok Setup Required');
console.log('');
console.log('To use Self authentication, you need to expose your local server to the internet.');
console.log('Here are the steps to set up ngrok:');
console.log('');
console.log('1. Install ngrok CLI:');
console.log('   - Go to https://ngrok.com/download');
console.log('   - Download and install ngrok for Windows');
console.log('   - Or use: choco install ngrok (if you have Chocolatey)');
console.log('');
console.log('2. Sign up for a free ngrok account:');
console.log('   - Go to https://dashboard.ngrok.com/signup');
console.log('   - Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken');
console.log('');
console.log('3. Authenticate ngrok:');
console.log('   - Run: ngrok config add-authtoken YOUR_AUTH_TOKEN');
console.log('');
console.log('4. Start the tunnel:');
console.log('   - Run: ngrok http 3001');
console.log('   - Copy the HTTPS URL (e.g., https://abc123.ngrok.io)');
console.log('');
console.log('5. Update your environment variables:');
console.log('   - Set SELF_ENDPOINT=https://your-ngrok-url.ngrok.io/api/auth/verify');
console.log('   - Set VITE_SELF_ENDPOINT=https://your-ngrok-url.ngrok.io/api/auth/verify');
console.log('');
console.log('Alternative: Use localtunnel (easier setup):');
console.log('1. Install: npm install -g localtunnel');
console.log('2. Run: lt --port 3001');
console.log('3. Use the provided URL in your environment variables');
console.log('');

async function startNgrok() {
  console.log('❌ Ngrok not configured properly.');
  console.log('Please follow the setup instructions above.');
  process.exit(1);
}

if (require.main === module) {
  startNgrok();
}

module.exports = startNgrok;