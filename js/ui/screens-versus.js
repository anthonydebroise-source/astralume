// Écrans multijoueur : duel fantôme (lien à partager) et course en direct (salons via le relais)
import { h, btn, iconBtn, register, go, back, widget, modal, curBar, toast } from './ui.js';
import { SVG } from './icons.js';
import { app } from '../app.js';
import { S, saveSoon } from '../economy/save.js';
import { SHIP_BY_ID } from '../economy/data.js';
import { music } from '../audio/music.js';
import { sfx } from '../audio/sfx.js';
import { ctx, setT, baseT } from '../engine/renderer.js';
import { glow } from '../engine/sprites.js';
import { TAU } from '../engine/math.js';
import { drawHypercar } from '../game/hypercar.js';
import { decodeDuel, duelLink } from '../net/ghost.js';
import { LiveLink, relayURL } from '../net/live.js';

const topbar = (title) => h('div', { class: 'topbar' }, iconBtn(SVG.back, back, 'Retour'), h('div', { class: 'title' }, title), curBar());
const pad = (n) => String(Math.max(0, Math.round(n))).padStart(8, '0');

// Partage d'un défi : feuille de partage iPhone, sinon presse-papiers, sinon code affiché
export async function shareDuel(codeP, score) {
  const code = await codeP;
  if (!code) return;
  const url = duelLink(code);
  const text = `J’ai fait ${pad(score)} points sur Astralume. Bats mon fantôme !`;
  S.duel.sent = (S.duel.sent || 0) + 1; saveSoon();
  if (navigator.share) {
    try { await navigator.share({ title: 'Astralume — Duel fantôme', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); toast('Lien copié !', 'Colle-le dans un message à ton ami.'); return; } catch (e) { /* on affiche le code */ }
  const ta = h('textarea', { class: 'code-box', readonly: true, rows: 4 }); ta.value = url;
  modal([h('h2', { class: 'pink-t' }, 'Ton défi'), h('p', { class: 'center muted' }, 'Copie ce lien et envoie-le à ton ami :'), ta]);
  setTimeout(() => { ta.focus(); ta.select(); }, 50);
}

// Petit dessin : deux vaisseaux face à face
function vsArt(cA, cB, idA, idB) {
  return (r, t) => {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, c] of [[cx - r.w * 0.24, cA], [cx + r.w * 0.24, cB]]) { const g = glow(c, 32); ctx.globalAlpha = 0.55; ctx.drawImage(g.c, x - 40, cy - 40, 80, 80); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    setT(cx - r.w * 0.24, cy + Math.sin(t * 2) * 3, 0.95); ctx.rotate(0.35); drawHypercar(ctx, idA, t, 0.2); baseT();
    setT(cx + r.w * 0.24, cy + Math.cos(t * 2) * 3, 0.95); ctx.rotate(-0.35); ctx.globalAlpha = 0.55; drawHypercar(ctx, idB, t, -0.2); ctx.globalAlpha = 1; baseT();
    ctx.font = '900 italic 26px "Avenir Next Condensed",system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.strokeStyle = '#1a0630'; ctx.strokeText('VS', cx, cy); ctx.fillStyle = '#ffd23f'; ctx.fillText('VS', cx, cy);
  };
}

// ================= ACCUEIL MULTIJOUEUR =================
register('versus', {
  build() {
    app.pseudo();
    const name = h('input', { type: 'text', class: 'pseudo-in', maxlength: 16, value: S.pseudo, autocomplete: 'off', spellcheck: 'false' });
    name.addEventListener('change', () => { const v = name.value.replace(/[^\p{L}\p{N} _\-.]/gu, '').trim().slice(0, 16); S.pseudo = v || S.pseudo; name.value = S.pseudo; saveSoon(); });
    const D = S.duel || { w: 0, l: 0 };
    // --- Duel fantôme ---
    const duelArt = h('div', { class: 'mode-art' }); widget(duelArt, vsArt('#38f2ff', '#ff4fd8', S.ship || 'etincelle', 'faucheuse'));
    const askCode = () => {
      const ta = h('textarea', { class: 'code-box', rows: 4, placeholder: 'Colle ici le lien ou le code reçu' });
      const err = h('div', { class: 'muted small center' });
      const m = modal([h('h2', { class: 'pink-t' }, 'Relever un défi'), ta, err,
        h('div', { class: 'row', style: 'margin-top:10px' }, btn('Annuler', 'ghost', () => m.close()), h('div', { class: 'spacer' }),
          btn('Valider', 'primary', async () => { const d = await decodeDuel(ta.value); if (!d) { err.textContent = 'Code illisible : vérifie qu’il est complet.'; sfx.deny(); return; } m.close(); go('duelInvite', { duel: d }); }))]);
    };
    const duelCard = h('div', { class: 'mode-card', style: '--c:#ff4fd8' }, duelArt,
      h('div', { class: 'mode-body' }, h('b', null, 'DUEL FANTÔME'), h('small', null, 'Défie un ami par message'),
        h('p', null, 'Joue un secteur, puis envoie le lien : ton ami affronte ton fantôme sur exactement les mêmes vagues. Le meilleur score gagne.'),
        h('div', { class: 'mode-rec' }, `Victoires ${D.w || 0} · Défaites ${D.l || 0}`),
        h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, btn('CRÉER UN DÉFI', 'primary', () => { sfx.open(); app.startDuel({}); }), btn('J’ai un code', 'ghost', askCode))));
    // --- Course en direct ---
    const url = relayURL(S);
    const liveArt = h('div', { class: 'mode-art' }); widget(liveArt, vsArt('#38f2ff', '#ffd23f', S.ship || 'etincelle', 'phenix'));
    const liveBody = h('div', { class: 'mode-body' });
    const lobby = h('div', { class: 'lobby' });
    const renderLobby = () => {
      const L = app.live;
      lobby.innerHTML = '';
      if (!L || L.state === 'closed') return;
      const pilots = [{ name: S.pseudo + ' (toi)', ship: S.ship, host: L.host }, ...[...L.peers.values()].map((p) => ({ name: p.name, ship: p.ship }))];
      lobby.append(h('div', { class: 'lobby-code' }, h('small', null, 'CODE DU SALON'), h('b', null, L.room)),
        h('div', { class: 'lobby-list' }, ...pilots.map((p, i) => h('div', { class: 'lobby-p' }, h('i', { style: `background:${['#38f2ff', '#ff4fd8', '#ffd23f', '#7dff9a'][i]}` }), p.name, h('span', { class: 'muted small' }, ' · ' + ((SHIP_BY_ID[p.ship] || {}).name || ''))))),
        L.host ? btn(pilots.length > 1 ? 'LANCER LA COURSE' : 'En attente d’un 2e pilote…', 'primary' + (pilots.length > 1 ? '' : ' cant'), () => L.start())
          : h('div', { class: 'muted small' }, 'En attente du lancement par l’hôte…'),
        btn('Quitter le salon', 'ghost', () => { L.close(); app.live = null; renderLobby(); renderLive(); }));
    };
    const join = async (code) => {
      if (app.live) app.live.close();
      const L = new LiveLink(url);
      app.live = L;
      L.on('lobby', renderLobby).on('close', () => { if (ui_isVersus()) { toast('Déconnecté', 'Le salon a été fermé.'); app.live = null; renderLobby(); renderLive(); } })
        .on('start', (d) => { sfx.open(); toast('C’est parti !', 'Même secteur pour tous : le meilleur score gagne.'); setTimeout(() => app.startDuel({ seed: d.seed, live: L }), Math.max(300, d.at - Date.now())); });
      try { await L.connect(code, app.pseudo(), S.ship); renderLive(); renderLobby(); }
      catch (e) { app.live = null; toast('Connexion impossible', L.err || 'Serveur injoignable'); sfx.deny(); }
    };
    const renderLive = () => {
      liveBody.innerHTML = '';
      const codeIn = h('input', { type: 'text', class: 'room-in', maxlength: 4, placeholder: 'CODE', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' });
      liveBody.append(h('b', null, 'COURSE EN DIRECT'), h('small', null, '2 à 4 pilotes en même temps'),
        h('p', null, 'Chacun joue sur son téléphone le même secteur, au même moment : tu vois les vaisseaux des autres et le classement en direct.'));
      if (!url) liveBody.append(h('div', { class: 'mode-rec' }, 'Serveur en cours de déploiement — bientôt disponible.'));
      else if (app.live && app.live.state !== 'closed') liveBody.append(lobby);
      else liveBody.append(h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap;align-items:center' }, btn('CRÉER UN SALON', 'primary', () => join('')), codeIn, btn('Rejoindre', '', () => { const c = codeIn.value.trim().toUpperCase(); if (c.length === 4) join(c); else sfx.deny(); })));
    };
    renderLive();
    const liveCard = h('div', { class: 'mode-card' + (url ? '' : ' locked'), style: '--c:#38f2ff' }, liveArt, liveBody);
    return h('div', null, topbar('Multijoueur'), h('div', { class: 'scroll' },
      h('div', { class: 'pseudo-row' }, h('span', null, 'Ton nom de pilote'), name),
      duelCard, liveCard));
  },
  enter() { music.play('menu'); },
});
const ui_isVersus = () => !!document.querySelector('.pseudo-row');

// ================= DÉFI REÇU =================
register('duelInvite', {
  build(P) {
    const d = P.duel, ship = SHIP_BY_ID[d.ship] ? d.ship : 'etincelle';
    const art = h('div', { class: 'invite-art' });
    widget(art, (r, t) => {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      ctx.globalCompositeOperation = 'lighter';
      const g = glow('#ff4fd8', 32); ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 3); ctx.drawImage(g.c, cx - 90, cy - 90, 180, 180);
      ctx.strokeStyle = '#ff4fd8'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
      for (let i = 0; i < 3; i++) { const k = ((t * 0.6 + i / 3) % 1); ctx.globalAlpha = 0.6 * (1 - k); ctx.beginPath(); ctx.arc(cx, cy, 30 + k * 60, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      setT(cx, cy + Math.sin(t * 2) * 4, 1.5); ctx.globalAlpha = 0.75; drawHypercar(ctx, ship, t, Math.sin(t) * 0.2); ctx.globalAlpha = 1; baseT();
    });
    return h('div', null, topbar('Défi reçu'), h('div', { class: 'scroll center' },
      h('h1', { class: 'arc-title win', style: 'font-size:30px' }, 'DÉFI !'),
      h('div', { class: 'invite-name' }, h('b', null, d.name), ' te défie en duel'),
      art,
      h('div', { class: 'arc-score' }, h('div', { class: 'arc-lab' }, 'SCORE À BATTRE'), h('b', null, pad(d.score))),
      h('p', { class: 'muted' }, `Secteur de duel n° ${d.seed % 100000} · son vaisseau : ${(SHIP_BY_ID[ship] || {}).name || ship}`),
      h('p', { class: 'small' }, 'Tu joues exactement les mêmes vagues que lui, avec son fantôme à l’écran. Pas de seconde chance : fais mieux que son score !'),
      h('div', { class: 'row', style: 'margin-top:12px' }, btn('Plus tard', 'ghost', () => go('hub', {}, false)), h('div', { class: 'spacer' }),
        btn('RELEVER LE DÉFI', 'primary big', () => { sfx.open(); app.startDuel({ ghost: d }); }))));
  },
  enter() { music.play('menu'); },
});

// ================= PANNEAU DE RÉSULTAT (duel / course) =================
export function versusPanel(R) {
  const V = R.versus;
  const box = h('div', { class: 'panel vs-res' });
  const render = () => {
    box.innerHTML = '';
    if (app.live && V.kind === 'race') {
      const me = V.rows.find((r) => r.me);
      V.rows = [me, ...[...app.live.peers.values()].map((p, i) => ({ name: p.name, score: p.score || 0, color: ['#ff4fd8', '#ffd23f', '#7dff9a'][i % 3], live: !p.done }))].sort((a, b) => b.score - a.score);
    }
    V.rows.forEach((r, i) => box.append(h('div', { class: 'vs-row' + (r.me ? ' me' : '') }, h('span', { class: 'vs-rank' }, i + 1), h('span', { class: 'vs-name', style: `color:${r.color}` }, r.name + (r.live ? ' · en course…' : '')), h('b', null, pad(r.score)))));
    if (V.kind === 'duel' && V.code) {
      box.append(h('div', { class: 'row', style: 'margin-top:8px;gap:6px;flex-wrap:wrap' },
        btn(V.rival ? '📨 Défier à mon tour' : '📨 ENVOYER LE DÉFI', 'primary', () => shareDuel(V.code, R.score))));
    }
  };
  render();
  if (app.live && V.kind === 'race') app.live.on('end', () => { if (box.isConnected) render(); });
  return box;
}
