# ASTRALUME

Shoot 'em up vertical néon, original, jouable au doigt sur iPhone.
La Nuée, une faune bioluminescente, dévore la lumière des étoiles : vous êtes l'Allumeur d'étoiles chargé de les rallumer, monde après monde.

- 320 niveaux générés (32 mondes à thème, espace et survols de planètes), 3 difficultés par niveau
- Boss tous les 5 niveaux : gardiens (niveaux x-5) et colosses (x-10), avec des parties à détruire une à une
- 10 vaisseaux, 7 drones, attaques spéciales, super mode Hypernova
- Économie complète : pièces, cristaux, gemmes, composants, coffres, roue, missions, succès, cadeau quotidien
- Aucune publicité, aucun achat. Graphismes et sons entièrement générés par le code (aucune image ni aucun son externe).

## Adresse du jeu

Une fois GitHub Pages activé (voir ci-dessous), le jeu est disponible à l'adresse :
**https://anthonydebroise-source.github.io/astralume/**

## Héberger le jeu gratuitement (GitHub Pages)

1. Créez un compte sur https://github.com (gratuit).
2. Créez un nouveau dépôt **public** nommé par exemple `astralume`.
3. Envoyez-y le contenu de ce dossier (le fichier `index.html` doit être à la racine du dépôt) :
   - soit depuis le site GitHub : *Add file → Upload files*, puis glissez tous les fichiers et dossiers ;
   - soit en ligne de commande :
     ```bash
     git remote add origin https://github.com/VOTRE-NOM/astralume.git
     git push -u origin main
     ```
4. Dans le dépôt : *Settings → Pages → Build and deployment → Source : Deploy from a branch*, branche `main`, dossier `/ (root)`, puis *Save*.
5. Après une à deux minutes, le jeu est en ligne à l'adresse `https://VOTRE-NOM.github.io/astralume/`.

Autres hébergeurs gratuits possibles : Netlify, Cloudflare Pages, Vercel (glisser-déposer du dossier). Le jeu est un site statique : aucun serveur n'est nécessaire.

## Installer le jeu sur iPhone (comme une vraie application)

1. Ouvrez l'adresse du jeu dans **Safari** (pas dans une autre application).
2. Touchez le bouton **Partager** (le carré avec une flèche vers le haut).
3. Choisissez **Sur l'écran d'accueil** (« Ajouter à l'écran d'accueil »), puis **Ajouter**.
4. Lancez Astralume depuis son icône : il s'ouvre en plein écran, en mode portrait, et fonctionne ensuite **hors ligne**.

Conseils :
- Si le son est muet, vérifiez le bouton silencieux de l'iPhone et les réglages du jeu.
- La progression est sauvegardée automatiquement sur l'appareil (stockage local du navigateur). Elle n'est pas partagée entre Safari et l'application installée : jouez toujours depuis l'icône.

## Mettre à jour le jeu après une modification

Le service worker garde le jeu en cache pour le mode hors ligne. Après avoir modifié des fichiers :

```bash
node tools/build.mjs --no-icons
```

Cette commande régénère la liste des fichiers et le numéro de version dans `sw.js`, ce qui force les appareils à télécharger la nouvelle version. Sans `--no-icons`, elle régénère aussi les icônes PNG à partir de `js/icon.js` (nécessite Node.js et Playwright).

## Tester sur ordinateur

```bash
python3 -m http.server 8000
```

Puis ouvrez http://localhost:8000 (souris ou doigt pour piloter, barre d'espace pour la spéciale).
La page `dev-play.html?L=10&ship=lance` lance directement un niveau (outil de développement).

## Menus

- **Jouer** : lance le prochain niveau (choix de la difficulté et des boosts).
- **Carte des mondes** : les 32 mondes et leurs 10 niveaux.
- **Hangar** : vaisseaux, drones et améliorations permanentes.
- **Trésors** : coffres et roue de la fortune.
- **Quêtes** : cadeau du jour, missions, étoiles et succès.
- **Engrenage** (en haut à droite) : son, contrôles, qualité graphique.

## Commandes de jeu

- Glissez le doigt : le vaisseau suit avec un léger décalage pour rester visible. Le tir est automatique.
- Attaque spéciale : bouton en bas à droite, ou toucher l'écran avec un second doigt.
- Déclenchée pile sur le temps de la musique, la spéciale est **PARFAITE** (+35 %).
- Enchaînez 8 éliminations rapides pour embraser une **constellation**.
- Rattrapez les morceaux des boss qui tombent pour gagner des composants.

## Architecture

```
index.html, manifest.webmanifest, sw.js   PWA (plein écran, hors ligne)
css/style.css                             interface néon
js/main.js                                démarrage, boucle, récompenses de fin de niveau
js/app.js                                 état partagé
js/engine/   rendu, sprites en cache, particules, contrôle tactile, maths
js/audio/    bus audio, bruitages synthétisés, séquenceur de musique procédurale
js/game/     partie, joueur, vaisseaux, spéciales, ennemis, boss, drones,
             bonus, constellations, anomalies, décors, interface en jeu
js/levels/   32 mondes, générateur de niveaux, formations
js/economy/  sauvegarde, monnaies, coffres et roue, quotidien, succès
js/ui/       écrans (accueil, carte, hangar, atelier, coffres, roue, missions…)
tools/build.mjs   génération des icônes et de la liste de cache
```
