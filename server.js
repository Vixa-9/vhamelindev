const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const SITE_DIR = process.env.SITE_DIR || path.join(__dirname, 'site');
const PORT = process.env.PORT || 3000;

// ─── Formulaire de contact ───────────────────────────────────────────────────
// Même comportement que Worduel (server/index.js) : garder les deux en phase.

const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const MAIL_FROM = process.env.MAIL_FROM; // expéditeur validé dans Brevo, obligatoire
const MAIL_TO = process.env.MAIL_TO || 'vhamelindev@gmail.com';
const MAIL_LABEL = 'Portfolio';

const CONTACT_LIMITS = { name: 100, email: 200, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // STARTTLS
  requireTLS: true,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const smtpReady = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'].every((name) => process.env[name]);

// Indique au démarrage quelles variables sont présentes (jamais leurs valeurs), puis teste la connexion SMTP.
function checkMailConfig() {
  const state = (name, fallback) => (process.env[name] ? 'défini' : fallback ? 'par défaut' : 'MANQUANT');
  console.log(
    `[contact] SMTP_HOST ${state('SMTP_HOST')}, SMTP_USER ${state('SMTP_USER')}, SMTP_PASS ${state('SMTP_PASS')}, ` +
      `MAIL_FROM ${state('MAIL_FROM')}, MAIL_TO ${state('MAIL_TO', true)}, port ${SMTP_PORT}`
  );
  if (!smtpReady) {
    console.error('[contact] configuration incomplète : le formulaire répondra 500 sans tenter d\'envoi');
    return;
  }
  mailer
    .verify()
    .then(() => console.log('[contact] connexion SMTP vérifiée'))
    .catch((err) => console.error(`[contact] vérification SMTP échouée : ${err.code || 'ERREUR'} ${err.message}`));
}

// Une valeur placée dans un en-tête de mail ne doit contenir aucun retour à la ligne.
const oneLine = (value) => value.replace(/[\r\n]+/g, ' ').trim();

// Renvoie { error } ou { name, email, message } nettoyés.
function readContact(body) {
  const { name, email, message } = body || {};
  if (![name, email, message].every((v) => typeof v === 'string' && v.trim())) {
    return { error: 'Formulaire incomplet' };
  }
  if (name.length > CONTACT_LIMITS.name || email.length > CONTACT_LIMITS.email || message.length > CONTACT_LIMITS.message) {
    return { error: 'Message trop long' };
  }
  const cleanEmail = oneLine(email);
  if (!EMAIL_RE.test(cleanEmail)) return { error: 'Adresse e-mail invalide' };
  return { name: oneLine(name), email: cleanEmail, message: message.trim() };
}

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de messages, réessaie plus tard.' },
});

app.post(
  '/api/contact',
  contactLimiter,
  express.json({ limit: '20kb' }),
  express.urlencoded({ extended: false, limit: '20kb' }),
  async (req, res) => {
    if (req.body?.honeypot) return res.json({ ok: true }); // robot : on fait semblant

    const contact = readContact(req.body);
    if (contact.error) return res.status(400).json({ error: contact.error });

    if (!smtpReady) {
      console.error('[contact] envoi impossible : configuration SMTP incomplète');
      return res.status(500).json({ error: 'Envoi impossible pour le moment' });
    }

    try {
      const info = await mailer.sendMail({
        from: `"${MAIL_LABEL}" <${MAIL_FROM}>`,
        to: MAIL_TO,
        replyTo: contact.email,
        subject: `[${MAIL_LABEL}] Message de ${contact.name}`,
        text: `Nom : ${contact.name}\nEmail : ${contact.email}\n\nMessage :\n${contact.message}`,
      });
      console.log(`[contact] message envoyé (${info.messageId})`);
      res.json({ ok: true });
    } catch (err) {
      console.error(`[contact] envoi échoué : ${err.code || 'ERREUR'}${err.responseCode ? ` ${err.responseCode}` : ''} ${err.message}`);
      res.status(500).json({ error: 'Envoi impossible pour le moment' });
    }
  }
);

app.use(express.static(SITE_DIR));
app.use((req, res) => res.status(404).sendFile(path.join(SITE_DIR, '404.html'), (e) => e && res.status(404).send('Page introuvable')));

app.listen(PORT, () => {
  console.log(`Portfolio sur :${PORT}`);
  checkMailConfig();
});
