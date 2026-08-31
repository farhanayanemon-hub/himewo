const https = require('https');

const urls = [
  'https://himewo.com',
  'https://api.himewo.com/api/healthz',
  'https://admin.himewo.com',
  'https://ads.himewo.com',
  'https://himewo-mobile.pages.dev',
  'https://himewo-chat.pages.dev'
];

async function checkUrl(url) {
  return new Promise(resolve => {
    https.get(url, { timeout: 8000 }, res => {
      resolve({ url, status: res.statusCode });
    }).on('error', err => {
      resolve({ url, error: err.message });
    });
  });
}

async function main() {
  console.log('Checking live production URLs:');
  for (const u of urls) {
    const r = await checkUrl(u);
    console.log(`${r.url} => ${r.status || r.error}`);
  }
}

main();
