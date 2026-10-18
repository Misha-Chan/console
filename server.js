// ============================================================
//  console — سيرفر مستقل للوحة التحكم وصفحة التعريف بالمشروع
//  كل منطق المصادقة/قاعدة البيانات/صلاحيات الأدمن يبقى على السيرفر
//  الرئيسي (hostaka.fun)؛ هذا السيرفر واجهة + بروكسي شفاف لـ /api/* تجاهه.
// ============================================================
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();

const HOSTAKA_API_BASE = process.env.HOSTAKA_API_BASE || 'https://hostaka.fun';

app.disable('x-powered-by');
// نثق بوكيل واحد فقط (بروكسي Vercel) قبل الطلب، بدل `true` اللي يثق بأي
// X-Forwarded-For ويسمح بتزوير req.ip — نفس نمط aethercast/orbithub.
app.set('trust proxy', 1);

// رؤوس أمان أساسية على كل الردود (كانت غائبة).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
});

// ============================================================
// بروكسي /api/* — نفس أسلوب orbithub وaethercast بالضبط
// ============================================================
app.use('/api', express.raw({ type: '*/*', limit: '10mb' }), async (req, res) => {
  try {
    const targetUrl = HOSTAKA_API_BASE + '/api' + req.url;

    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (['host', 'connection', 'content-length', 'accept-encoding'].includes(key.toLowerCase())) continue;
      headers[key] = value;
    }

    const hasBody = req.body && Buffer.isBuffer(req.body) && req.body.length > 0;
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      redirect: 'manual'
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

    const buf = await upstream.buffer();
    res.send(buf);
  } catch (e) {
    console.error('❌ console proxy error:', e);
    res.status(502).json({ error: 'تعذر الاتصال بخادم هوستاكا الرئيسي' });
  }
});

// ============================================================
// ملفات ثابتة
// ============================================================
app.use(express.static(path.join(__dirname, 'public')));

function sendPrivate(res, fileName) {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.sendFile(path.join(__dirname, 'public', fileName));
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html'))); // صفحة تعريفية عامة، قابلة للفهرسة
app.get('/user/console', (req, res) => sendPrivate(res, 'console.html')); // لوحة خاصة، بدون فهرسة

app.get('/robots.txt', (req, res) => {
  const origin = `https://${req.get('host')}`;
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /user/\n\nSitemap: ${origin}/sitemap.xml\n`);
});

// ============================================================
// sitemap.xml — Console (console.hostaka.fun), part of the Hostaka
// Ecosystem. Announcement page for new updates from the admin team,
// and admin tools for moderators. The admin panel itself (/user/console)
// is private and excluded via robots.txt above, so the sitemap only
// lists the public announcements homepage — same pattern used by
// hostaka.fun/sitemap.xml.
// ============================================================
app.get('/sitemap.xml', (req, res) => {
  const origin = `https://${req.get('host')}`;
  res.type('application/xml').send(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${origin}/</loc><priority>1.0</priority></url>
</urlset>`);
});

// أي مسار غير معروف يرجع للصفحة الرئيسية التعريفية
app.use((req, res) => res.redirect('/'));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ console server running on port ${PORT} (proxying /api to ${HOSTAKA_API_BASE})`));
}

module.exports = app;
