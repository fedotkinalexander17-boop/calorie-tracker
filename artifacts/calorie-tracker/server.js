import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

const distPath = path.join(__dirname, 'dist/public');
console.log('Serving static files from:', distPath);
console.log('Index.html exists?', fs.existsSync(path.join(distPath, 'index.html')));

// Логируем каждый запрос
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Отдаём статические файлы
app.use(express.static(distPath));

// Все остальные запросы отдаём index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend server running on port ${port}`);
  console.log(`Serving from: ${distPath}`);
});