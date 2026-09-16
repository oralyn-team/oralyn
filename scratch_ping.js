const net = require('net');

const regions = [
  'aws-0-sa-east-1.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-0-us-east-2.pooler.supabase.com',
  'aws-0-us-west-1.pooler.supabase.com',
  'aws-0-us-west-2.pooler.supabase.com',
  'aws-0-eu-central-1.pooler.supabase.com',
  'aws-0-eu-west-1.pooler.supabase.com',
  'aws-0-eu-west-2.pooler.supabase.com',
  'aws-0-eu-west-3.pooler.supabase.com',
  'aws-0-ap-southeast-1.pooler.supabase.com',
  'aws-0-ap-southeast-2.pooler.supabase.com',
  'aws-0-ap-northeast-1.pooler.supabase.com',
  'aws-0-ap-northeast-2.pooler.supabase.com',
  'aws-0-ap-south-1.pooler.supabase.com',
  'aws-0-ca-central-1.pooler.supabase.com',
  'aws-0-me-central-1.pooler.supabase.com',
  'aws-0-sa-east-1.pooler.supabase.com',
  'aws-1-sa-east-1.pooler.supabase.com',
  'aws-1-us-east-1.pooler.supabase.com',
  'aws-1-us-east-2.pooler.supabase.com',
  'aws-1-us-west-1.pooler.supabase.com',
  'aws-1-us-west-2.pooler.supabase.com'
];

function checkHost(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      console.log(`[CONNECT SUCCESS] ${host}:${port}`);
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', (e) => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function run() {
  console.log("Checking direct db host...");
  await checkHost('db.jumqsstrwwzflsrmjkmj.supabase.co', 5432);
  
  console.log("Checking poolers...");
  for (const r of regions) {
    checkHost(r, 6543);
    checkHost(r, 5432);
  }
}

run();
