# Relais multijoueur d'Astralume

Petit serveur WebSocket **sans dépendance** (Node 18+) qui relie 2 à 4 pilotes pour la
**Course en direct**. Il ne calcule rien : chaque téléphone joue le même secteur (même graine)
et le serveur se contente de relayer positions et scores (8 fois par seconde, quelques octets).

Le **Duel fantôme** n'a pas besoin de ce serveur : le défi voyage entièrement dans le lien partagé.

## Tester en local

```bash
node server/relay.mjs
```

Puis ouvrir le jeu avec `?relay=ws://localhost:8787` dans l'adresse (sur deux onglets ou deux appareils
du même réseau, avec l'adresse IP de l'ordinateur à la place de `localhost`).

## Mettre en ligne (plus tard)

1. Héberger ce dossier `server/` sur n'importe quel hébergeur Node avec WebSocket
   (Render, Railway, Fly.io…). Commande de démarrage : `npm start`. Le port est lu dans `PORT`.
2. L'hébergeur fournit une adresse `https://…` : l'adresse du relais est la même en `wss://…`.
3. Renseigner cette adresse dans `js/net/live.js` (`DEFAULT_RELAY`) puis republier le jeu.
   La carte « Course en direct » se déverrouille alors automatiquement.

## Protocole (JSON)

| Sens | Message | Rôle |
|---|---|---|
| client → serveur | `{t:'join', room, name, ship}` | crée (room vide) ou rejoint un salon |
| serveur → client | `{t:'joined', id, room, host, seed, peers}` | entrée dans le salon |
| serveur → clients | `{t:'peer+'}` / `{t:'peer-'}` / `{t:'host'}` | arrivées, départs, nouvel hôte |
| hôte → serveur | `{t:'start'}` | lance la course pour tous (même graine) |
| client → serveur | `{t:'st', x, y, s, a}` | position (0–1), score, vivant |
| client → serveur | `{t:'end', s, w}` | score final |
