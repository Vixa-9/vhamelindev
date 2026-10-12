# vhamelindev.fr

Portfolio de Victor Hamelin, élève ingénieur à l'ISEN Brest et développeur web à la Marine nationale.

Site statique en HTML, CSS et JavaScript, sans framework, servi par un petit serveur Express
qui gère aussi le formulaire de contact.

## Structure

| Chemin | Rôle |
|---|---|
| `site/` | Le site : `index.html`, `style.css`, `main.js`, `asset/` |
| `server.js` | Serveur Express : fichiers statiques et route `POST /api/contact` |
| `Dockerfile` | Image de production, déployée par Dokploy à chaque push sur `main` |

## Lancer en local

```bash
npm install
npm start
```

Le site est servi sur http://localhost:3000.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `PORT` | Port d'écoute (3000 par défaut) |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Serveur d'envoi des messages du formulaire (port 587, STARTTLS) |
| `MAIL_TO` | Destinataire des messages (`vhamelindev@gmail.com` par défaut) |
| `MAIL_FROM` | Expéditeur (`SMTP_USER` par défaut) |

## Crédits

Faces des dés de Norndice rendues à partir des modèles « Norndice Dice Game » de un auteur tiers (CC BY-NC).
