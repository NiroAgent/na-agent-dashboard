// Ultra minimal test server
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(4000, '127.0.0.1', () => {
  console.log('Minimal server running on http://127.0.0.1:4000');
});
