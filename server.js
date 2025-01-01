// server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Where we store user => { passcode , hash, randomNumber }
let userData = {};

const hostname = '127.0.0.1';
const port = 3000;

// 1. Load userData from userdata.json on startup (if it exists)
(function loadUserDataFromFile() {
  try {
    if (fs.existsSync('userdata.json')) {
      const fileContent = fs.readFileSync('userdata.json', 'utf-8');
      userData = JSON.parse(fileContent);
      console.log('Loaded existing user data from userdata.json:', userData);
    } else {
      console.log('No existing userdata.json found. Starting fresh.');
    }
  } catch (err) {
    console.error('Error loading userdata.json:', err);
    userData = {};
  }
})();

/**
 * Generate a random passcode (for demo purposes).
 */
function generateRandomPasscode() {
  return Math.random().toString(36).slice(2, 10); // e.g., 'fj39lkb1'
}

/**
 * Write the user data object to userdata.json
 */
function saveUserDataToFile() {
  fs.writeFile('userdata.json', JSON.stringify(userData, null, 2), (err) => {
    if (err) {
      console.error('Error writing userdata.json:', err);
    }
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname || '/index.html';
  const searchParams = requestUrl.searchParams;
  const pass = searchParams.get('pass');
  // 1. Handle /admin.html (protected by ADMIN_PASS)
  if (pathname === '/admin.html') {
    if (pass !== process.env.ADMIN_PASS) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('403 - Forbidden (Invalid Admin Pass)');
    }
    return serveStaticFile(res, './admin.html');
  }

  // 2. Handle /get-user-data (so admin can see current user data)
  if (pathname === '/get-user-data') {
    if (pass !== process.env.ADMIN_PASS) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Forbidden (Invalid Admin Pass)' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(userData));
  }

  if (pathname === '/remove-user') {
    if (pass !== process.env.ADMIN_PASS) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Forbidden (Invalid Admin Pass)' }));
    }

    const userName = searchParams.get('user');
    if (!userName) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing "user" query parameter' }));
    }

    userData[userName] = undefined;

    saveUserDataToFile();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(userData));
  }

  // 3. Handle /generate-link - only admin can call this
  if (pathname === '/generate-link') {
    if (pass !== process.env.ADMIN_PASS) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Forbidden (Invalid Admin Pass)' }));
    }

    const userName = searchParams.get('user');
    if (!userName) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing "user" query parameter' }));
    }

    // Generate a random code and store it
    const newCode = generateRandomPasscode();
    userData[userName] = {pass: newCode};

    // Persist to userdata.json
    saveUserDataToFile();

    // Construct a link that the user can use to access index.html
    const link = `http://${hostname}:${port}/index.html?pass=${newCode}`;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ user: userName, link }));
  }

  // 4. Handle /index.html WITH pass check
  if (pathname === '/index.html') {
    const canAccess = Object.values(userData).some(data => data.pass == pass);

    if (!canAccess) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('403 - Forbidden (Invalid or Missing Passcode)');
    }
    return serveStaticFile(res, './index.html');
  }
  
  // 5. Handle storing hash with pass check
  if (pathname === '/store-hash') {
    const canAccess = Object.values(userData).some(data => data.pass == pass);

    if (!canAccess) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('403 - Forbidden (Invalid or Missing Passcode)');
    }
    // Grab 'pass' and 'hash' from query
    const newHash  = searchParams.get('hash');
    if (!newHash) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('400 - Hash Missing');
    }

    const currentData = Object.values(userData).find(data => data && data.pass == pass);
    if(currentData && !currentData.hash){
      currentData.hash = newHash;
      saveUserDataToFile();
    }

    res.writeHead(200, { 'Content-Type': 'text/json' });
    return res.end(JSON.stringify(Object.keys(userData).map(userName => ({userName: userName, hash: userData[userName].hash}))));
  }

  // 6. Handle storing random number with pass check
  if (pathname === '/store-random-number') {
    const canAccess = Object.values(userData).some(data => data.pass == pass);

    if (!canAccess) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('403 - Forbidden (Invalid or Missing Passcode)');
    }
    // Grab 'pass' and 'hash' from query
    const randomNumber = searchParams.get('random');
    if (!randomNumber) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('400 - Hash Missing');
    }

    const currentData = Object.values(userData).find(data => data.pass == pass);
    if(!currentData.randomNumber){
      currentData.randomNumber = randomNumber;
      saveUserDataToFile();
    }

    res.writeHead(200, { 'Content-Type': 'text/json' });
    return res.end(JSON.stringify(Object.keys(userData).map(userName => ({userName: userName, randomNumber: userData[userName].randomNumber}))));
  }

  //  If any other route is requested, return 403
  res.writeHead(403, { 'Content-Type': 'text/plain' });
  return res.end('403 - Forbidden (No pass provided or invalid path)');
});

/**
 * Serve a static file from disk.
 */
function serveStaticFile(res, filePath) {
  const extname = path.extname(filePath);
  let contentType = 'text/html';

  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpeg';
      break;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 - File Not Found');
      }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end(`500 - Server Error: ${err.code}`);
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content, 'utf-8');
  });
}

// Start the server
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
