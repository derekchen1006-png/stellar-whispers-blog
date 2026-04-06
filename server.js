const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');

// Simple admin password — change this before deploying!
const ADMIN_PASSWORD = 'astro2026';

app.use(express.json());
app.use(express.static(__dirname));

// ── Helpers ──────────────────────────────────────────────────
function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
function authAdmin(req, res) {
  const pw = req.headers['x-admin-password'];
  if (pw !== ADMIN_PASSWORD) {
    res.status(401).json({ error: '密碼錯誤' });
    return false;
  }
  return true;
}

// ── Articles ──────────────────────────────────────────────────
// GET all articles (newest first)
app.get('/api/articles', (req, res) => {
  const articles = readJSON(ARTICLES_FILE);
  res.json(articles.slice().reverse());
});

// GET single article
app.get('/api/articles/:id', (req, res) => {
  const articles = readJSON(ARTICLES_FILE);
  const article = articles.find(a => a.id === req.params.id);
  if (!article) return res.status(404).json({ error: '文章不存在' });
  res.json(article);
});

// POST new article (admin only)
app.post('/api/articles', (req, res) => {
  if (!authAdmin(req, res)) return;
  const { title, tag, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: '標題與內容為必填' });

  const articles = readJSON(ARTICLES_FILE);
  const article = {
    id: crypto.randomUUID(),
    title,
    tag: tag || '',
    content,
    date: new Date().toISOString(),
  };
  articles.push(article);
  writeJSON(ARTICLES_FILE, articles);
  res.status(201).json(article);
});

// DELETE article (admin only)
app.delete('/api/articles/:id', (req, res) => {
  if (!authAdmin(req, res)) return;
  let articles = readJSON(ARTICLES_FILE);
  const before = articles.length;
  articles = articles.filter(a => a.id !== req.params.id);
  if (articles.length === before) return res.status(404).json({ error: '文章不存在' });
  writeJSON(ARTICLES_FILE, articles);
  // also remove comments
  let comments = readJSON(COMMENTS_FILE);
  writeJSON(COMMENTS_FILE, comments.filter(c => c.articleId !== req.params.id));
  res.json({ ok: true });
});

// ── Comments ──────────────────────────────────────────────────
// GET comments for an article
app.get('/api/articles/:id/comments', (req, res) => {
  const comments = readJSON(COMMENTS_FILE);
  res.json(comments.filter(c => c.articleId === req.params.id));
});

// POST comment
app.post('/api/articles/:id/comments', (req, res) => {
  const articles = readJSON(ARTICLES_FILE);
  if (!articles.find(a => a.id === req.params.id)) {
    return res.status(404).json({ error: '文章不存在' });
  }
  const { author, body } = req.body;
  if (!author || !body) return res.status(400).json({ error: '名稱與留言為必填' });
  if (body.length > 500) return res.status(400).json({ error: '留言最多 500 字' });

  const comments = readJSON(COMMENTS_FILE);
  const comment = {
    id: crypto.randomUUID(),
    articleId: req.params.id,
    author: author.slice(0, 30),
    body: body.slice(0, 500),
    date: new Date().toISOString(),
  };
  comments.push(comment);
  writeJSON(COMMENTS_FILE, comments);
  res.status(201).json(comment);
});

// DELETE comment (admin only)
app.delete('/api/comments/:id', (req, res) => {
  if (!authAdmin(req, res)) return;
  let comments = readJSON(COMMENTS_FILE);
  const before = comments.length;
  comments = comments.filter(c => c.id !== req.params.id);
  if (comments.length === before) return res.status(404).json({ error: '留言不存在' });
  writeJSON(COMMENTS_FILE, comments);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`星語占星 running at http://localhost:${PORT}`);
});
