/**
 * Debug Version - Timings Réduits pour Test Rapide
 * 
 * À utiliser UNIQUEMENT pour tester!
 * Copie ce contenu dans script.js pour remplacer les CONFIG
 */

// DEBUG: Timings réduits pour test
const CONFIG = {
  PIN: '1234',
  GRID_SIZE: 100,
  TREE_GOAL: 2,  // ← Réduit à 2 arbres au lieu de 14
  SPROUT_DURATION: 5000,    // ← 5 secondes au lieu de 1 heure
  TREE_DURATION: 10000,     // ← 10 secondes au lieu de 24 heures
  ANIMATION_SPEED: 500,     // ← 500ms par frame au lieu de 1000ms
  EMAIL: 'daniel.guedj.pro@gmail.com'
};

/**
 * INSTRUCTIONS DE TEST:
 * 
 * 1. Ouvre index.html dans ton serveur local
 * 2. Entre le PIN: 1234
 * 3. Plante 2 graines (drag depuis le menu)
 * 4. Attends 5 secondes → tu vois la pousse animer
 * 5. Attends 10 secondes au total → l'arbre apparaît
 * 6. La popup Valentine devrait apparaître!
 * 
 * Pour revenir à la version normale, efface localStorage:
 * localStorage.removeItem('valentineGrid');
 * location.reload();
 */
