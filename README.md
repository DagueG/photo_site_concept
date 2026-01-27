# 🌹 Valentine Garden - Guide de Déploiement

## ✅ Implémentation Complète

Ton jeu Valentine est prêt! Voici l'état final:

### Fichiers Créés/Modifiés:
- ✅ `index.html` - Grille 100×100 interactive + modales PIN et Valentine
- ✅ `style.css` - Thème Stardew Valley (herbe, cœurs, animations)
- ✅ `script.js` - Système complet avec:
  - Authentification PIN (code: `1234`)
  - Grille persistante (localStorage)
  - Drag & drop graine + pelle
  - Animation 3 frames: 1→2→3→1→2→3...
  - Timestamps individuels pour chaque plante
  - 14 arbres = popup Valentine
  - Email intégré

### Assets (✅ Tous présents):
```
assets/img/
  ├── grass.png       (fond tuiles)
  ├── seeds.png       (graine menu)
  ├── shovel.png      (pelle menu)
  ├── sprout_1.png    (pousse frame 1)
  ├── sprout_2.png    (pousse frame 2)
  ├── sprout_3.png    (pousse frame 3)
  ├── tree_1.png      (arbre frame 1)
  ├── tree_2.png      (arbre frame 2)
  └── tree_3.png      (arbre frame 3)
```

---

## 📧 Configuration de l'Email (IMPORTANT!)

Le jeu est **prêt à envoyer des emails** via FormSubmit (gratuit).

### Étapes:
1. Aller sur [https://formspree.io](https://formspree.io)
2. S'inscrire avec email: `daniel.guedj.pro@gmail.com`
3. Créer un **New Form** 
4. Copier l'**ID du form** (ex: `f/abc123xyz`)
5. **Remplacer** dans `script.js` ligne ~263:
```javascript
fetch('https://formspree.io/f/YOUR_FORM_ID', {
```
Devient:
```javascript
fetch('https://formspree.io/f/abc123xyz', {
```

---

## 🎮 Gameplay

### Code PIN:
```
1234
```

### Mécanique:
1. Drag graine du menu → case vide
2. Graine pousse 1h (3 frames animées)
3. Après 1h → devient arbre (3 frames animées)
4. Drag pelle pour retirer une plante
5. **14 arbres plantés depuis 24h** → Popup "Veux-tu être ma Valentine?"
6. "Oui" → Email envoyé à `daniel.guedj.pro@gmail.com`

### Timings:
- **Sprout**: 1 heure (3600000ms)
- **Tree**: 24 heures (86400000ms)
- **Animation**: 1 seconde par frame (1000ms)

---

## 🚀 Déploiement GitHub Pages

### Prérequis:
- Repo GitHub: `thecoloss/thecoloss.github.io` (ou similaire)
- Domaine custom: `thecoloss.com`

### Étapes:
1. **Push les fichiers** sur GitHub Pages
   ```bash
   git add .
   git commit -m "Init Valentine Garden game"
   git push origin main
   ```

2. **Configurer domaine custom** dans GitHub Pages settings:
   - Paramètres du repo → Pages
   - Custom domain: `thecoloss.com`
   - Vérifier que le CNAME pointe vers GitHub

3. **Vérifier les Assets**:
   - Tous les chemins `assets/img/` doivent être valides

---

## 🐛 Test Local

Ouvre avec un serveur local (pas en file://, sinon drag-drop ne marche pas):

```bash
# Avec Python 3
python -m http.server 8000

# Ou avec Node
npx http-server

# Puis ouvre: http://localhost:8000
```

---

## 🎨 Personnalisation

### Changer le code PIN:
Dans `script.js` ligne ~7:
```javascript
PIN: '1234',  // → Changer ici
```

### Changer les timings:
```javascript
SPROUT_DURATION: 3600000,   // 1 heure en ms
TREE_DURATION: 86400000,    // 24 heures en ms
ANIMATION_SPEED: 1000,      // ms par frame
```

### Changer l'email:
```javascript
EMAIL: 'daniel.guedj.pro@gmail.com',  // → Changer ici
```

---

## ✨ Features Actuelles

- ✅ Grille 100×100 (10 000 cases)
- ✅ Drag & drop illimité
- ✅ Persistance localStorage
- ✅ Animation 3 frames
- ✅ Timestamps individuels
- ✅ Transition sprout → tree automatique
- ✅ Compteur d'arbres
- ✅ Popup Valentine Stardew Valley
- ✅ Email gratuit (FormSubmit)
- ✅ PIN 4 chiffres

---

## 🎁 Prêt pour la Saint-Valentin!

Une fois FormSubmit configuré, c'est **100% opérationnel**.

Des questions? Je suis là pour ajuster! 🌹
