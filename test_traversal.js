const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/../server/generateMap.js', // Try to access the server code
  method: 'GET'
};

console.log("Testing Directory Traversal on http://localhost:3000/../server/generateMap.js");

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 403) {
      console.log("✅ SUCCESS: Server blocked the attack (403 Forbidden).");
    } else if (res.statusCode === 200) {
      console.log("❌ FAILURE: Server returned the file! (Vulnerable).");
      console.log("Snippet of file content:", data);
    } else {
      console.log(`Received status ${res.statusCode}`);
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
  console.log("Make sure the server is running!");
});

req.end();
