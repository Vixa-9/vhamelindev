const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const SITE_DIR = process.env.SITE_DIR || path.join(__dirname, 'site');
const PORT = process.env.PORT || 3000;
const MAIL_TO = process.env.MAIL_TO || 'vhamelindev@gmail.com';
const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER;

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  requireTLS: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de messages, réessaie plus tard.',
});

app.post('/api/contact', contactLimiter, express.urlencoded({ extended: false, limit: '20kb' }), async (req, res) => {
  const { name, email, message, honeypot } = req.body || {};
  if (honeypot) return res.send('Message envoyé ✔️'); // bot : on fait semblant
  if (!name || !email || !message) return res.status(400).send('Formulaire incomplet');
  if (String(name).length > 100 || String(email).length > 200 || String(message).length > 5000) {
    return res.status(400).send('Message trop long');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).send('Email invalide');

  try {
    await mailer.sendMail({
      from: `"Portfolio" <${MAIL_FROM}>`,
      to: MAIL_TO,
      replyTo: email,
      subject: '📩 Nouveau message depuis ton portfolio',
      text: `Nom : ${name}\nEmail : ${email}\n\nMessage :\n${message}`,
    });
    res.send('Message envoyé ✔️');
  } catch (err) {
    console.error('Envoi mail impossible :', err.message);
    res.status(500).send("Erreur lors de l'envoi du message");
  }
});

app.use(express.static(SITE_DIR));
app.use((req, res) => res.status(404).sendFile(path.join(SITE_DIR, '404.html'), (e) => e && res.status(404).send('Page introuvable')));

app.listen(PORT, () => console.log(`Portfolio sur :${PORT}`));
