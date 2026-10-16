# vhamelindev.fr

Portfolio de Victor Hamelin, élève ingénieur à l'ISEN Brest et développeur d'applications web
au laboratoire numérique de la Marine nationale.

Site en HTML, CSS et JavaScript, sans framework, servi par un petit serveur Express
qui gère aussi le formulaire de contact.

---

## Contenu du site

| Section | Contenu |
|---|---|
| Accueil | Présentation, poste actuel, formation, langues, localisation |
| Profil | Parcours, course des 20 km de Paris pour le SCA, passions |
| Compétences | Front-end, back-end, autres langages, bases de données, DevOps, systèmes |
| Projets | Norndice, Worduel, système d'information de la faculté de Tien Giang (Vietnam), Goal Calendar, Biblio-Drive |
| Expérience | Stage international au Vietnam, Marine nationale, ministère des Armées |
| Formation | ISEN Brest, BTS SIO SLAM, baccalauréat |
| Contact | Formulaire envoyé par e-mail, liens LinkedIn et GitHub |

Le site existe en français et en anglais, en thème sombre et clair. Les deux choix sont mémorisés dans le navigateur.

---

## Technique

- **Aucun framework ni build** : `index.html`, `style.css` et `main.js` sont servis tels quels.
- **Bilingue** : chaque texte existe en `<span class="fr">` et `<span class="en">`, la langue affichée dépend de `<html lang>`.
- **Effets en CSS** :
  - dés de Norndice en 3D (`transform-style: preserve-3d`), avec les vraies faces du jeu ;
  - tuiles Worduel qui se retournent comme dans Wordle ;
  - halo de bordure qui suit la souris sur les cartes ;
  - barre de progression liée au défilement (`animation-timeline: scroll()`) ;
  - changement de thème en cercle (View Transitions API) ;
  - grille de points éclairée autour du curseur dans l'accueil.
- **JavaScript** : défilement doux vers les sections, apparition au défilement (`IntersectionObserver`),
  frise d'expérience qui se remplit, galeries d'images, envoi du formulaire.
- **Accessibilité** : lien d'évitement, focus visible, toutes les animations coupées si
  `prefers-reduced-motion` est activé.

---

## Structure

```
vhamelindev/
├── site/
│   ├── index.html
│   ├── style.css
│   ├── main.js
│   ├── 404.html
│   └── asset/          # logos, icônes de compétences, captures des projets, faces des dés
├── server.js           # Express : fichiers statiques + POST /api/contact
├── Dockerfile          # Image de production
├── package.json
└── README.md
```

---

## Lancer en local

```bash
npm install
npm start
```

Le site est servi sur http://localhost:3000. Sans variables SMTP, le formulaire répond par une erreur à l'envoi,
le reste du site fonctionne.

Pour tester l'image de production :

```bash
docker build -t vhamelindev .
docker run --rm -p 3000:3000 vhamelindev
```

---

## Formulaire de contact

`POST /api/contact` (`server.js`). Même comportement que Worduel : les deux sont à garder en phase.

| Cas | Réponse |
|---|---|
| Message envoyé | `200 { "ok": true }` |
| Champ `honeypot` rempli (robot) | `200 { "ok": true }`, rien n'est envoyé |
| Champ manquant, trop long ou e-mail invalide | `400 { "error": "..." }` |
| Plus de 5 messages par IP en 15 minutes | `429 { "error": "..." }` |
| Configuration incomplète ou envoi SMTP en échec | `500 { "error": "..." }` |

- Champs `name`, `email`, `message`, en JSON (ou formulaire encodé) ; limites 100, 200 et 5 000 caractères.
- Les retours à la ligne sont retirés du nom et de l'e-mail avant de les mettre dans les en-têtes du mail.
- Mail envoyé : sujet `[Portfolio] Message de {nom}`, corps « Nom / Email / Message », `Reply-To` = e-mail du visiteur.
- Délais SMTP : 10 s pour la connexion et l'accueil du serveur, 15 s d'inactivité. Le navigateur abandonne au bout de 20 s.

Au démarrage, le serveur indique dans ses logs quelles variables sont définies (jamais leurs valeurs),
puis teste la connexion SMTP :

```
[contact] SMTP_HOST défini, SMTP_USER défini, SMTP_PASS défini, MAIL_FROM défini, MAIL_TO par défaut, port 2525
[contact] connexion SMTP vérifiée
```

Chaque envoi est journalisé : `[contact] message envoyé (...)` ou `[contact] envoi échoué : CODE message`
(`ETIMEDOUT` : port bloqué ou hôte injoignable, `EAUTH` : identifiants refusés, `EENVELOPE` : expéditeur ou destinataire refusé).

---

## Variables d'environnement

Mêmes variables que Worduel, saisies dans Dokploy (jamais dans le dépôt).

| Variable | Obligatoire | Rôle |
|---|---|---|
| `SMTP_HOST` | oui | `smtp-relay.brevo.com` |
| `SMTP_PORT` | non | Port SMTP, `587` par défaut. **Mettre `2525` sur le VPS**, qui bloque les ports 25, 465 et 587 en sortie |
| `SMTP_USER` | oui | Identifiant SMTP Brevo (`xxx@smtp-brevo.com`) |
| `SMTP_PASS` | oui | Clé SMTP Brevo |
| `MAIL_FROM` | oui | Expéditeur, sur un domaine validé dans Brevo. Jamais l'identifiant `@smtp-brevo.com` |
| `MAIL_TO` | non | Destinataire, `vhamelindev@gmail.com` par défaut |
| `PORT` | non | Port d'écoute du serveur, `3000` par défaut |

---

## Hébergement

Même serveur et même fonctionnement que Worduel (voir le
[guide de déploiement de Worduel](https://github.com/Vixa-9/Worduel/blob/main/DEPLOYMENT.md)).

| Élément | Valeur |
|---|---|
| Serveur | VPS Debian 13, `159.195.8.14` |
| Plateforme | Dokploy, projet **Applications perso** |
| Source | GitHub `Vixa-9/vhamelindev`, branche `main` |
| Build | `Dockerfile` (Node 22 Alpine, utilisateur `node`) |
| Port du conteneur | `3000` |
| Domaines | `vhamelindev.fr` et `www.vhamelindev.fr`, HTTPS Let's Encrypt via Traefik |
| Déploiement | Automatique à chaque push sur `main` |

### Nom de domaine

`vhamelindev.fr` est enregistré chez **Hostinger**. Zone DNS :

| Type | Nom | Cible |
|---|---|---|
| A | `@` | `159.195.8.14` |
| A | `www` | `159.195.8.14` |

### Mettre à jour le site

```bash
git add .
git commit -m "description du changement"
git push
```

Dokploy reconstruit l'image et remplace le conteneur. Le suivi est dans Dokploy → application → **Deployments**.

---

## Crédits

Faces des dés de Norndice : rendues par le générateur de modèles de Norndice (dessinées par le code).
