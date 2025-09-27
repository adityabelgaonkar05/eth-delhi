const localtunnel = require('localtunnel');

async function startTunnel() {
  try {
    console.log('🚀 Starting localtunnel...');
    
    const tunnel = await localtunnel({ 
      port: 3001,
      subdomain: `cryptoverse-${Date.now().toString().slice(-6)}` // unique subdomain
    });

    console.log('✅ Tunnel created successfully!');
    console.log('');
    console.log(`🌐 Your public URL: ${tunnel.url}`);
    console.log('');
    console.log('📝 Update your environment variables:');
    console.log(`   SELF_ENDPOINT=${tunnel.url}/api/auth/verify`);
    console.log(`   VITE_SELF_ENDPOINT=${tunnel.url}/api/auth/verify`);
    console.log('');
    console.log('🔄 Restart your frontend after updating the environment variables.');
    console.log('');
    console.log('⚠️  Keep this terminal open to maintain the tunnel.');

    tunnel.on('close', () => {
      console.log('🛑 Tunnel closed');
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Closing tunnel...');
      tunnel.close();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Closing tunnel...');
      tunnel.close();
      process.exit(0);
    });

    return tunnel.url;
  } catch (error) {
    console.error('❌ Error creating tunnel:', error.message);
    console.log('');
    console.log('💡 Alternative solutions:');
    console.log('1. Try again (sometimes localtunnel has temporary issues)');
    console.log('2. Use ngrok instead (see ngrok setup instructions)');
    console.log('3. Deploy to a cloud service for production');
    process.exit(1);
  }
}

if (require.main === module) {
  startTunnel();
}

module.exports = startTunnel;