const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 10000;

// Отдаём статические файлы
app.use(express.static(path.join(__dirname, 'dist/public')));

// Все остальные запросы отдаём index.html (для React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend server running on port ${port}`);
});