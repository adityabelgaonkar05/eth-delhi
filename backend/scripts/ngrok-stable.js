const ngrok = require('ngrok');

async function startStableNgrok() {
  try {
    console.log('🚀 Starting stable ngrok tunnel...');
    
    // Connect with more stable settings
    const url = await ngrok.connect({
      addr: 3001,
      region: 'us', // or 'eu', 'ap', 'au', 'sa', 'jp', 'in'
      bind_tls: true,
      onStatusChange: status => console.log(`📡 Tunnel status: ${status}`),
      onLogEvent: data => {
        if (data.level === 'ERROR') {
          console.log('❌ Tunnel error:', data.msg);
        }
      }
    });

    console.log('✅ Stable ngrok tunnel established!');
    console.log('🌐 Public URL:', url);
    console.log('📋 Copy this URL to your .env file:');
    console.log(`SELF_ENDPOINT=${url}/api/auth/verify`);
    console.log(`BACKEND_URL=${url}`);
    
    // Keep the process alive
    process.on('SIGINT', async () => {
      console.log('🛑 Shutting down ngrok...');
      await ngrok.disconnect();
      await ngrok.kill();
      process.exit(0);
    });

    // Auto-restart on disconnect
    ngrok.getApi().then(api => {
      setInterval(async () => {
        try {
          const tunnels = await api.listTunnels();
          if (tunnels.tunnels.length === 0) {
            console.log('🔄 Tunnel disconnected, restarting...');
            await startStableNgrok();
          }
        } catch (error) {
          console.log('⚠️ Error checking tunnel status:', error.message);
        }
      }, 30000); // Check every 30 seconds
    });

    return url;
  } catch (error) {
    console.error('❌ Error starting stable ngrok:', error);
    
    // Fallback to localtunnel
    console.log('🔄 Falling back to localtunnel...');
    return startLocaltunnel();
  }
}

async function startLocaltunnel() {
  const localtunnel = require('localtunnel');
  
  const tunnel = await localtunnel({ 
    port: 3001,
    subdomain: 'cryptoverse-' + Math.random().toString(36).substr(2, 6)
  });

  console.log('🌐 Localtunnel URL:', tunnel.url);
  console.log('📋 Copy this URL to your .env file:');
  console.log(`SELF_ENDPOINT=${tunnel.url}/api/auth/verify`);
  
  tunnel.on('close', () => {
    console.log('❌ Localtunnel closed, restarting...');
    setTimeout(startLocaltunnel, 2000);
  });

  return tunnel.url;
}

if (require.main === module) {
  startStableNgrok();
}

module.exports = { startStableNgrok };