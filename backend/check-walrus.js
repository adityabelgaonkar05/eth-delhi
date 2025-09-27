/**
 * Walrus Service Health Check
 * Quick test to verify Walrus endpoints are accessible
 */

const https = require('https');
const http = require('http');

const WALRUS_PUBLISHER = 'https://publisher-devnet.walrus.space';
const WALRUS_AGGREGATOR = 'https://aggregator-devnet.walrus.space';

function checkEndpoint(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, { method: 'GET', timeout: 5000 }, (res) => {
      resolve({
        url,
        status: res.statusCode,
        accessible: res.statusCode < 500
      });
    });

    req.on('error', (error) => {
      resolve({
        url,
        status: 'ERROR',
        accessible: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        accessible: false,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

async function healthCheck() {
  console.log('🏥 Walrus Service Health Check\n');

  const endpoints = [
    WALRUS_PUBLISHER,
    WALRUS_AGGREGATOR,
    `${WALRUS_PUBLISHER}/v1/health`,
    `${WALRUS_AGGREGATOR}/v1/health`
  ];

  const results = await Promise.all(endpoints.map(checkEndpoint));

  results.forEach(result => {
    const status = result.accessible ? '✅' : '❌';
    console.log(`${status} ${result.url}`);
    console.log(`   Status: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });

  const allAccessible = results.every(r => r.accessible);
  
  if (allAccessible) {
    console.log('🎉 All Walrus endpoints are accessible!');
    return true;
  } else {
    console.log('⚠️  Some Walrus endpoints are not accessible.');
    console.log('This may affect Walrus storage functionality.');
    return false;
  }
}

// Run health check if this file is executed directly
if (require.main === module) {
  healthCheck().then(healthy => {
    process.exit(healthy ? 0 : 1);
  });
}

module.exports = healthCheck;