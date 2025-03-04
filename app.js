const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const lodash = require('lodash');
const cookieParser = require('cookie-parser');
const libxmljs = require('libxmljs');
const ejs = require('ejs');
const request = require('request');

const app = express();
const db = new sqlite3.Database(':memory:');

// A1:2017-Injection (SQLi)
app.get('/search', (req, res) => {
  const query = `SELECT * FROM users WHERE name = '${req.query.name}'`;
  db.all(query, (err, rows) => {
    res.json(rows);
  });
});

// A2:2017-Broken Authentication
app.post('/login', bodyParser.json(), (req, res) => {
  const user = req.body.username;
  const pass = req.body.password;
  
  if (user === 'admin' && pass === 'admin123') {
    res.cookie('admin', 'true', { httpOnly: false });
    res.send('Logged in!');
  } else {
    res.status(401).send('Invalid credentials');
  }
});

// A3:2017-Sensitive Data Exposure
app.get('/users', (req, res) => {
  res.json([
    { name: 'Alice', ssn: '123-45-6789', password: 'password123' },
    { name: 'Bob', ssn: '987-65-4321', password: 'qwerty' }
  ]);
});

// A4:2017-XXE
app.post('/parse-xml', bodyParser.text(), (req, res) => {
  const xml = req.body;
  const doc = libxmljs.parseXml(xml, { noent: true });
  res.send(doc.toString());
});

// A5:2017-Broken Access Control
app.get('/admin', (req, res) => {
  if (req.cookies.admin === 'true') {
    res.send('Admin panel: ...');
  } else {
    res.status(403).send('Forbidden');
  }
});

// A7:2017-XSS
app.get('/reflect', (req, res) => {
  res.send(ejs.render(`<h1>Hello <%= query.name %></h1>`, {
    query: req.query
  }));
});

// A8:2017-Insecure Deserialization
const unserialize = require('node-serialize').unserialize;
app.get('/deserialize', (req, res) => {
  const serialized = req.query.data;
  const obj = unserialize(serialized);
  res.send('Done');
});

// A9:2017-Using Components with Known Vulnerabilities
// (Using old lodash version with prototype pollution)
app.get('/merge', (req, res) => {
  const malicious = JSON.parse(req.query.payload);
  const obj = lodash.merge({}, malicious);
  res.send('Merged');
});

// A10:2017-Insufficient Logging
app.post('/transfer', bodyParser.json(), (req, res) => {
  const amount = req.body.amount;
  const to = req.body.to;
  // No logging of transaction
  res.send(`Transferred ${amount} to ${to}`);
});

// A10:2021-Server-Side Request Forgery (SSRF)
app.get('/fetch', (req, res) => {
    const url = req.query.url;
    
    // Vulnerable: No validation of user-supplied URL
    request.get(url, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        res.send(body);
      } else {
        res.status(500).send('Error fetching URL');
      }
    });
  });
  
  // Another SSRF example using different protocol
  app.post('/export', bodyParser.json(), (req, res) => {
    const data = req.body;
    
    // Vulnerable: Allows file:// protocol
    const xmlData = `<?xml version="1.0"?><root>${data.content}</root>`;
    fs.writeFile('/tmp/export.xml', xmlData, (err) => {
      request.get('file:///tmp/export.xml', (e, r, b) => {
        res.send(b);
      });
    });
  });
  

app.listen(3000, () => console.log('Server running on port 3000'));