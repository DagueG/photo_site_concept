/**
 * Valentine Garden - Canvas Version
 * Optimisée avec Canvas pour meilleure performance
 */

// Configuration
const CONFIG = {
  PIN: '1234',
  PIN_SHARED: '2609',
  GRID_SIZE: 100,
  CELL_SIZE: 64,
  TREE_GOAL: 14,
  SEED_DURATION: 180000 + Math.random() * 120000, // 3 à 5 minutes en ms
  SPROUT_DURATION: 5000, // 5 secondes supplémentaires en ms (total 10s)
  EMAIL: 'daniel.guedj.pro@gmail.com'
};

// Supabase Config
const SUPABASE_URL = 'https://ydwgxkoophokwizxqsyj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4thxPpvJmu8pnmkshxPqGg_aI-_3l3z';

// State
const gameState = {
  grid: {},
  draggedTool: null,
  isSharedMode: false, // true si PIN 2609, false si PIN 1234
  equippedTool: null, // Outil actuellement équippé
  isAuthenticated: false,
  valentineShown: false,
  scrollX: 0,
  scrollY: 0,
  images: {},
  isMapDragging: false,
  isToolBrushing: false, // Flag pour drag avec outil équippé
  dragStartX: 0,
  dragStartY: 0,
  dragStartScrollX: 0,
  dragStartScrollY: 0,
  lastDragX: 0, // Position souris précédente pour calculer vélocité
  lastDragY: 0, // Position souris précédente pour calculer vélocité
  scrollVelocityX: 0, // Inertie X
  scrollVelocityY: 0, // Inertie Y
  isInertia: false, // Appliquer l'inertie après drag
  waterFrame: 0 // Pour animer l'eau
};

// Canvas & context
let canvas, ctx;
let minimapCanvas, minimapCtx;

// ========== AUTHENTIFICATION ==========
function setupAuth() {
  const pinInput = document.getElementById('pinInput');
  const pinSubmit = document.getElementById('pinSubmit');
  
  pinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      checkPin();
    }
  });
  
  pinSubmit.addEventListener('click', checkPin);
}

function checkPin() {
  const pinInput = document.getElementById('pinInput');
  const entered = pinInput.value.trim();
  
  if (entered === CONFIG.PIN) {
    // Mode local (1234)
    gameState.isAuthenticated = true;
    gameState.isSharedMode = false;
    document.getElementById('pinModal').classList.add('hidden');
    document.getElementById('gameContainer').classList.remove('hidden');
    // Cacher la quête en mode local
    const questBar = document.querySelector('.quest-bar');
    if (questBar) questBar.classList.add('hidden');
    loadGameState();
    initGame();
  } else if (entered === CONFIG.PIN_SHARED) {
    // Mode partagé (2609)
    gameState.isAuthenticated = true;
    gameState.isSharedMode = true;
    document.getElementById('pinModal').classList.add('hidden');
    document.getElementById('gameContainer').classList.remove('hidden');
    // Montrer la quête en mode partagé
    const questBar = document.querySelector('.quest-bar');
    if (questBar) questBar.classList.remove('hidden');
    loadGameState();
    initGame();
    document.getElementById('gameContainer').classList.remove('hidden');
    loadGameState();
    initGame();
  } else {
    pinInput.value = '';
    pinInput.style.borderColor = '#ff6b9d';
    pinInput.style.backgroundColor = '#ffe0e0';
    setTimeout(() => {
      pinInput.style.borderColor = '';
      pinInput.style.backgroundColor = '';
    }, 500);
  }
}

// ========== SAUVEGARDE / CHARGEMENT ==========
function saveGameState() {
  if (gameState.isSharedMode) {
    // Sauvegarder sur Supabase
    saveToSupabase();
  } else {
    // Sauvegarder en local
    localStorage.setItem('valentineGrid', JSON.stringify(gameState.grid));
  }
}

function loadGameState() {
  if (gameState.isSharedMode) {
    // Charger depuis Supabase
    loadFromSupabase();
  } else {
    // Charger depuis localStorage
    const saved = localStorage.getItem('valentineGrid');
    if (saved) {
      gameState.grid = JSON.parse(saved);
    }
  }
}

async function saveToSupabase() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/shared_map?id=eq.1`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        grid: gameState.grid,
        updated_at: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      console.error('Supabase save error:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Erreur sauvegarde Supabase:', error);
  }
}

async function loadFromSupabase() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/shared_map?id=eq.1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        gameState.grid = data[0].grid || {};
      }
    } else {
      console.error('Supabase load error:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Erreur chargement Supabase:', error);
  }
}

// ========== INITIALISATION ==========
function initGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  minimapCanvas = document.getElementById('minimapCanvas');
  minimapCtx = minimapCanvas.getContext('2d');
  minimapCanvas.width = 150;
  minimapCanvas.height = 150;
  
  // Redimensionner canvas
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  
  // Charger les images
  loadAssets();
  
  // Event listeners
  canvas.addEventListener('dragover', handleCanvasDragOver);
  canvas.addEventListener('drop', handleCanvasDrop);
  canvas.addEventListener('dragleave', handleCanvasDragLeave);
  canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });
  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('mousedown', handleCanvasMouseDown);
  canvas.addEventListener('mousemove', handleCanvasMouseMove);
  canvas.addEventListener('mouseup', handleCanvasMouseUp);
  canvas.addEventListener('mouseleave', handleCanvasMouseUp);
  
  // Minimap click
  minimapCanvas.addEventListener('click', handleMinimapClick);
  
  // Redimensionner canvas quand la fenetre change
  window.addEventListener('resize', handleWindowResize);
  
  // Suivi position souris pour icône flottante
  document.addEventListener('mousemove', handleGlobalMouseMove);
  
  // Bouton Reset
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', handleResetMap);
  }
  
  // Ajouter event listener minimap
  minimapCanvas.addEventListener('click', handleMinimapClick);
  
  // Démarrer boucle
  startGameLoop();
  
  // Dessiner minimap une fois au démarrage
  drawMinimap();
}

// ========== REDIMENSIONNEMENT FENETRE ==========
function handleWindowResize() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}

// ========== CHARGEMENT ASSETS ==========
function loadAssets() {
  const assets = [
    'grass', 'seeds', 'shovel', 'bucket',
    'eau_1', 'eau_2', 'eau_3', 'sand',
    'sprout_1', 'sprout_2', 'sprout_3',
    'tree_1', 'tree_2', 'tree_3'
  ];
  
  assets.forEach(name => {
    const img = new Image();
    img.src = `assets/img/${name}.png`;
    gameState.images[name] = img;
  });
}

// ========== DRAG & DROP ==========
function setupDragDrop() {
  const seedTool = document.getElementById('seedTool');
  const shovelTool = document.getElementById('shovelTool');
  const bucketTool = document.getElementById('bucketTool');
  
  [seedTool, shovelTool, bucketTool].forEach(tool => {
    if (!tool) return;
    
    // Click to toggle equipped visual
    tool.addEventListener('click', (e) => {
      e.stopPropagation();
      const floatingIcon = document.getElementById('floatingToolIcon');
      
      // Si c'est le même outil équippé, le dégrise
      if (tool.classList.contains('equipped')) {
        tool.classList.remove('equipped');
        floatingIcon.classList.add('hidden');
        gameState.equippedTool = null;
      } else {
        // Sinon, dégrise tous les autres et équipe celui-ci
        [seedTool, shovelTool, bucketTool].forEach(t => {
          if (t && t !== tool) {
            t.classList.remove('equipped');
          }
        });
        
        tool.classList.add('equipped');
        gameState.equippedTool = tool.id;
        
        // Show floating icon
        const img = tool.querySelector('img');
        floatingIcon.innerHTML = `<img src="${img.src}" alt="${img.alt}"/>`;
        floatingIcon.classList.remove('hidden');
        // Position l'icône immédiatement sous la souris
        floatingIcon.style.left = (e.clientX - 24) + 'px';
        floatingIcon.style.top = (e.clientY - 24) + 'px';
      }
    });
    
    tool.addEventListener('dragstart', (e) => {
      gameState.draggedTool = tool.id;
      e.dataTransfer.effectAllowed = 'copy';
    });
    
    tool.addEventListener('dragend', () => {
      gameState.draggedTool = null;
    });
  });
}

function handleCanvasDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

function handleCanvasDragLeave(e) {
  // Nothing needed
}

function handleCanvasDrop(e) {
  e.preventDefault();
  
  if (!gameState.draggedTool) return;
  
  // Calculer position sur la grille
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left + gameState.scrollX;
  const y = e.clientY - rect.top + gameState.scrollY;
  
  const col = Math.floor(x / CONFIG.CELL_SIZE);
  const row = Math.floor(y / CONFIG.CELL_SIZE);
  
  // Vérifier limites
  if (row < 0 || row >= CONFIG.GRID_SIZE || col < 0 || col >= CONFIG.GRID_SIZE) {
    return;
  }
  
  const cellId = `${row}-${col}`;
  
  if (gameState.draggedTool === 'seedTool') {
    if (!gameState.grid[cellId]) {
      // Durée aléatoire entre 30 et 50 minutes
      const randomDuration = 1800000 + Math.random() * 1200000;
      gameState.grid[cellId] = {
        type: 'seed',
        stage: 1,
        plantedAt: Date.now(),
        growthDuration: randomDuration
      };
      saveGameState();
      updateTreeCount();
    }
  } else if (gameState.draggedTool === 'shovelTool') {
    if (gameState.grid[cellId]) {
      delete gameState.grid[cellId];
      saveGameState();
      updateTreeCount();
    }
  } else if (gameState.draggedTool === 'bucketTool') {
    // Ajouter de l'eau seulement sur les cases vides
    if (!gameState.grid[cellId]) {
      gameState.grid[cellId] = {
        type: 'water'
      };
      saveGameState();
    }
  }
}

function handleCanvasWheel(e) {
  e.preventDefault();
  
  const speed = 20;
  gameState.scrollY += e.deltaY > 0 ? speed : -speed;
  gameState.scrollX += e.deltaX > 0 ? speed : -speed;
  
  // Limiter scroll
  const maxScrollX = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE - canvas.width;
  const maxScrollY = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE - canvas.height;
  
  gameState.scrollX = Math.max(0, Math.min(gameState.scrollX, maxScrollX));
  gameState.scrollY = Math.max(0, Math.min(gameState.scrollY, maxScrollY));
  
  drawMinimap();
}

function handleCanvasClick(e) {
  // Si un outil est équippé, appliquer son action au clic
  if (!gameState.equippedTool) return;
  
  // Calculer position sur la grille
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left + gameState.scrollX;
  const y = e.clientY - rect.top + gameState.scrollY;
  
  const col = Math.floor(x / CONFIG.CELL_SIZE);
  const row = Math.floor(y / CONFIG.CELL_SIZE);
  
  // Vérifier limites
  if (row < 0 || row >= CONFIG.GRID_SIZE || col < 0 || col >= CONFIG.GRID_SIZE) {
    return;
  }
  
  const cellId = `${row}-${col}`;
  applyToolAction(gameState.equippedTool, cellId);
}

function handleMinimapClick(e) {
  const rect = minimapCanvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  
  const minimapScale = minimapCanvas.width / (CONFIG.GRID_SIZE * CONFIG.CELL_SIZE);
  
  // Convertir position minimap en coordonnées pixel du monde
  const worldPixelX = clickX / minimapScale;
  const worldPixelY = clickY / minimapScale;
  
  const viewportWidth = canvas.width;
  const viewportHeight = canvas.height;
  
  const maxScrollX = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE - canvas.width;
  const maxScrollY = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE - canvas.height;
  
  // Centrer sur le clic
  gameState.scrollX = Math.max(0, Math.min(worldPixelX - viewportWidth / 2, maxScrollX));
  gameState.scrollY = Math.max(0, Math.min(worldPixelY - viewportHeight / 2, maxScrollY));
  
  drawMinimap();
}

function applyToolAction(toolId, cellId) {
  if (toolId === 'seedTool') {
    if (!gameState.grid[cellId]) {
      // Durée aléatoire entre 30 et 50 minutes
      const randomDuration = 1800000 + Math.random() * 1200000;
      gameState.grid[cellId] = {
        type: 'seed',
        stage: 1,
        plantedAt: Date.now(),
        growthDuration: randomDuration
      };
      saveGameState();
      updateTreeCount();
      drawMinimap();
    }
  } else if (toolId === 'shovelTool') {
    if (gameState.grid[cellId]) {
      delete gameState.grid[cellId];
      saveGameState();
      updateTreeCount();
      drawMinimap();
    }
  } else if (toolId === 'bucketTool') {
    // Ajouter de l'eau seulement sur les cases vides
    if (!gameState.grid[cellId]) {
      gameState.grid[cellId] = {
        type: 'water'
      };
      saveGameState();
      drawMinimap();
    }
  }
}

// ========== DRAG MAP ==========
function handleCanvasMouseDown(e) {
  // Seulement avec le bouton gauche
  if (e.button !== 0) return;
  
  // Si un outil est équippé, commencer un "brush drag"
  if (gameState.equippedTool) {
    gameState.isToolBrushing = true;
    // Appliquer immédiatement à la case cliquée
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + gameState.scrollX;
    const y = e.clientY - rect.top + gameState.scrollY;
    
    const col = Math.floor(x / CONFIG.CELL_SIZE);
    const row = Math.floor(y / CONFIG.CELL_SIZE);
    
    if (row >= 0 && row < CONFIG.GRID_SIZE && col >= 0 && col < CONFIG.GRID_SIZE) {
      const cellId = `${row}-${col}`;
      applyToolAction(gameState.equippedTool, cellId);
    }
    return;
  }
  
  gameState.isMapDragging = true;
  gameState.dragStartX = e.clientX;
  gameState.dragStartY = e.clientY;
  gameState.dragStartScrollX = gameState.scrollX;
  gameState.dragStartScrollY = gameState.scrollY;
  gameState.lastDragX = e.clientX; // Pour calculer vélocité
  gameState.lastDragY = e.clientY; // Pour calculer vélocité
  canvas.style.cursor = 'grabbing';
}

function handleCanvasMouseMove(e) {
  // Si on est en train de brush avec un outil, appliquer l'action
  if (gameState.isToolBrushing && gameState.equippedTool) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + gameState.scrollX;
    const y = e.clientY - rect.top + gameState.scrollY;
    
    const col = Math.floor(x / CONFIG.CELL_SIZE);
    const row = Math.floor(y / CONFIG.CELL_SIZE);
    
    if (row >= 0 && row < CONFIG.GRID_SIZE && col >= 0 && col < CONFIG.GRID_SIZE) {
      const cellId = `${row}-${col}`;
      applyToolAction(gameState.equippedTool, cellId);
    }
    return;
  }
  
  if (!gameState.isMapDragging) return;
  
  // Calculer la vélocité (différence depuis la dernière position)
  const dxMouse = e.clientX - gameState.lastDragX;
  const dyMouse = e.clientY - gameState.lastDragY;
  gameState.scrollVelocityX = -dxMouse; // Négatif car on scroll inverse du mouvement souris
  gameState.scrollVelocityY = -dyMouse;
  
  gameState.lastDragX = e.clientX;
  gameState.lastDragY = e.clientY;
  
  const dx = e.clientX - gameState.dragStartX;
  const dy = e.clientY - gameState.dragStartY;
  
  gameState.scrollX = gameState.dragStartScrollX - dx;
  gameState.scrollY = gameState.dragStartScrollY - dy;
  
  // Limiter scroll
  const maxScrollX = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE - canvas.width;
  const maxScrollY = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE - canvas.height;
  
  gameState.scrollX = Math.max(0, Math.min(gameState.scrollX, maxScrollX));
  gameState.scrollY = Math.max(0, Math.min(gameState.scrollY, maxScrollY));
  
  drawMinimap();
}

function handleCanvasMouseUp(e) {
  gameState.isMapDragging = false;
  gameState.isToolBrushing = false;
  canvas.style.cursor = 'grab';
  
  // Activer l'inertie (continue jusqu'à vélocité négligeable)
  gameState.isInertia = true;
  
  drawMinimap();
}

function handleGlobalMouseMove(e) {
  const floatingIcon = document.getElementById('floatingToolIcon');
  if (!floatingIcon.classList.contains('hidden')) {
    // Position l'icône sous la souris avec un petit offset
    floatingIcon.style.left = (e.clientX - 24) + 'px';
    floatingIcon.style.top = (e.clientY - 24) + 'px';
  }
}

function handleResetMap() {
  // Afficher popup de confirmation
  const confirmed = confirm('Es-tu sûr? Ça va effacer TOUTE la map!');
  if (!confirmed) {
    return;
  }
  
  // Vider la grille
  gameState.grid = {};
  
  // Générer de l'eau aléatoire
  generateRandomWater();
  
  // Sauvegarder (en local ou Supabase selon le mode)
  saveGameState();
  
  // Reset les outils équippés
  gameState.equippedTool = null;
  [document.getElementById('seedTool'), 
   document.getElementById('shovelTool'), 
   document.getElementById('bucketTool')].forEach(tool => {
    if (tool) {
      tool.classList.remove('equipped');
    }
  });
  const floatingIcon = document.getElementById('floatingToolIcon');
  if (floatingIcon) {
    floatingIcon.classList.add('hidden');
  }
  
  // Reset la quête
  updateTreeCount();
  
  // Rafraîchir la minimap
  drawMinimap();
}

function generateRandomWater() {
  // Toujours générer de l'eau (100%)
  
  // Générer 1 rivière + 1 côte + plusieurs lacs (5-8)
  generateRiver();
  generateCoast();
  
  // Générer 5 à 8 lacs
  const numLakes = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < numLakes; i++) {
    generateLake();
  }
}

function generateLake() {
  // Éviter les collisions avec plages et rivières
  const centerCol = Math.floor(Math.random() * (CONFIG.GRID_SIZE * 0.6)) + CONFIG.GRID_SIZE * 0.2;
  const centerRow = Math.floor(Math.random() * (CONFIG.GRID_SIZE * 0.6)) + CONFIG.GRID_SIZE * 0.2;
  const baseRadius = 6 + Math.floor(Math.random() * 12); // 6 à 18 de rayon (plus petit)
  
  // Vérifier que le centre n'est pas trop près des bords
  if (centerRow < 15 || centerRow > CONFIG.GRID_SIZE - 15 || centerCol < 15 || centerCol > CONFIG.GRID_SIZE - 15) {
    return; // Rejeter si trop près du bord
  }
  
  // Variation aléatoire par angle pour créer des formes irrégulières mais fluides
  const radiusVariation = {};
  let lastVariation = 0.85 + Math.random() * 0.3; // 0.85 à 1.15
  
  for (let angle = 0; angle < 360; angle += 2) {
    lastVariation += (Math.random() - 0.5) * 0.1;
    lastVariation = Math.max(0.8, Math.min(1.2, lastVariation));
    radiusVariation[angle] = baseRadius * lastVariation;
  }
  
  for (let row = Math.max(0, centerRow - baseRadius - 2); row <= Math.min(CONFIG.GRID_SIZE - 1, centerRow + baseRadius + 2); row++) {
    for (let col = Math.max(0, centerCol - baseRadius - 2); col <= Math.min(CONFIG.GRID_SIZE - 1, centerCol + baseRadius + 2); col++) {
      const distance = Math.sqrt((row - centerRow) ** 2 + (col - centerCol) ** 2);
      let angle = Math.atan2(row - centerRow, col - centerCol) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      angle = Math.floor(angle / 2) * 2;
      
      const maxDist = radiusVariation[angle] || baseRadius;
      if (distance <= maxDist && !gameState.grid[`${row}-${col}`]) {
        gameState.grid[`${row}-${col}`] = { type: 'water' };
      }
    }
  }
}

function generateRiver() {
  // Rivière qui doit toucher DEUX bords différents de la map
  let validRiver = false;
  let attempts = 0;
  
  while (!validRiver && attempts < 10) {
    attempts++;
    const width = 6 + Math.floor(Math.random() * 8); // 6 à 14 de large
    
    // Choisir deux bords différents
    let startSide = Math.floor(Math.random() * 4); // 0=haut, 1=bas, 2=gauche, 3=droite
    let endSide = Math.floor(Math.random() * 4);
    
    // S'assurer que les deux bords sont différents
    while (endSide === startSide) {
      endSide = Math.floor(Math.random() * 4);
    }
    
    let row, col, direction;
    
    if (startSide === 0) {
      // Départ du haut, direction vers le bas
      row = 0 + Math.random() * 5;
      col = Math.random() * CONFIG.GRID_SIZE;
      direction = Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 6;
    } else if (startSide === 1) {
      // Départ du bas, direction vers le haut
      row = CONFIG.GRID_SIZE - 5 + Math.random() * 5;
      col = Math.random() * CONFIG.GRID_SIZE;
      direction = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 6;
    } else if (startSide === 2) {
      // Départ de la gauche, direction vers la droite
      row = Math.random() * CONFIG.GRID_SIZE;
      col = 0 + Math.random() * 5;
      direction = 0 + (Math.random() - 0.5) * Math.PI / 6;
    } else {
      // Départ de la droite, direction vers la gauche
      row = Math.random() * CONFIG.GRID_SIZE;
      col = CONFIG.GRID_SIZE - 5 + Math.random() * 5;
      direction = Math.PI + (Math.random() - 0.5) * Math.PI / 6;
    }
    
    const riverCells = [];
    
    // Continuer jusqu'à sortir de la map
    for (let i = 0; i < CONFIG.GRID_SIZE * 3; i++) {
      // Changer légèrement de direction (virage)
      if (Math.random() > 0.75) {
        direction += (Math.random() - 0.5) * Math.PI / 6; // Virage jusqu'à 30 degrés
      }
      
      // Avancer dans la direction actuelle (petit pas pour continuité)
      row += Math.sin(direction) * 0.5;
      col += Math.cos(direction) * 0.5;
      
      // Placer de l'eau sur la largeur (circulaire autour du centre)
      for (let w = 0; w < width; w++) {
        for (let h = 0; h < width; h++) {
          const distance = Math.sqrt((w - width/2) ** 2 + (h - width/2) ** 2);
          if (distance <= width / 2) {
            const offsetAngle = direction + Math.PI / 2; // Perpendiculaire
            const offsetRow = Math.floor(row + Math.sin(offsetAngle) * (w - width/2));
            const offsetCol = Math.floor(col + Math.cos(offsetAngle) * (h - width/2));
            
            if (offsetRow >= 0 && offsetRow < CONFIG.GRID_SIZE && offsetCol >= 0 && offsetCol < CONFIG.GRID_SIZE) {
              riverCells.push(`${offsetRow}-${offsetCol}`);
            }
          }
        }
      }
      
      // Vérifier si on a touché le bord de sortie voulu
      let touchedBorder = -1;
      if (row < -2) touchedBorder = 0; // haut
      else if (row > CONFIG.GRID_SIZE + 1) touchedBorder = 1; // bas
      else if (col < -2) touchedBorder = 2; // gauche
      else if (col > CONFIG.GRID_SIZE + 1) touchedBorder = 3; // droite
      
      // Si on a touché un bord différent du départ, c'est bon
      if (touchedBorder !== -1 && touchedBorder === endSide) {
        // Placer tous les cellules de la rivière
        riverCells.forEach(cellId => {
          if (!gameState.grid[cellId]) {
            gameState.grid[cellId] = { type: 'water' };
          }
        });
        validRiver = true;
        break;
      }
      
      // Si on est sorti par un mauvais bord, arrêter cette tentative
      if (touchedBorder !== -1 && touchedBorder !== endSide && touchedBorder !== startSide) {
        break;
      }
    }
  }
}

function generateCoast() {
  // Côte aléatoire limitée à un seul bord et plus courte
  const side = Math.floor(Math.random() * 4); // 0=haut, 1=bas, 2=gauche, 3=droite
  const baseThickness = 4 + Math.floor(Math.random() * 6); // 4 à 10 d'épaisseur (plus court)
  const variance = Math.random() * 0.4 + 0.6; // 0.6 à 1.0 multiplicateur
  
  if (side === 0) {
    // Haut - ondulant
    for (let col = 0; col < CONFIG.GRID_SIZE; col++) {
      const variation = Math.sin(col * 0.1) * baseThickness * 0.3 + baseThickness * variance;
      const thickness = Math.floor(variation);
      for (let row = 0; row < thickness; row++) {
        if (!gameState.grid[`${row}-${col}`]) {
          gameState.grid[`${row}-${col}`] = { type: 'water' };
        }
      }
    }
  } else if (side === 1) {
    // Bas - ondulant
    for (let col = 0; col < CONFIG.GRID_SIZE; col++) {
      const variation = Math.sin(col * 0.1) * baseThickness * 0.3 + baseThickness * variance;
      const thickness = Math.floor(variation);
      for (let row = CONFIG.GRID_SIZE - thickness; row < CONFIG.GRID_SIZE; row++) {
        if (row >= 0 && !gameState.grid[`${row}-${col}`]) {
          gameState.grid[`${row}-${col}`] = { type: 'water' };
        }
      }
    }
  } else if (side === 2) {
    // Gauche - ondulant
    for (let row = 0; row < CONFIG.GRID_SIZE; row++) {
      const variation = Math.sin(row * 0.1) * baseThickness * 0.3 + baseThickness * variance;
      const thickness = Math.floor(variation);
      for (let col = 0; col < thickness; col++) {
        if (!gameState.grid[`${row}-${col}`]) {
          gameState.grid[`${row}-${col}`] = { type: 'water' };
        }
      }
    }
  } else {
    // Droite - ondulant
    for (let row = 0; row < CONFIG.GRID_SIZE; row++) {
      const variation = Math.sin(row * 0.1) * baseThickness * 0.3 + baseThickness * variance;
      const thickness = Math.floor(variation);
      for (let col = CONFIG.GRID_SIZE - thickness; col < CONFIG.GRID_SIZE; col++) {
        if (col >= 0 && !gameState.grid[`${row}-${col}`]) {
          gameState.grid[`${row}-${col}`] = { type: 'water' };
        }
      }
    }
  }
}

// ========== BOUCLE DE JEU ==========
function startGameLoop() {
  let lastSaveTime = Date.now();
  let waterAnimationCounter = 0;
  
  setInterval(() => {
    // Appliquer l'inertie si elle est active
    if (gameState.isInertia) {
      const maxScrollX = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE - canvas.width;
      const maxScrollY = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE - canvas.height;
      
      gameState.scrollX += gameState.scrollVelocityX;
      gameState.scrollY += gameState.scrollVelocityY;
      
      // Décélération (0.94 = diminue la vélocité de 6% chaque frame)
      gameState.scrollVelocityX *= 0.94;
      gameState.scrollVelocityY *= 0.94;
      
      // Garder dans les limites
      gameState.scrollX = Math.max(0, Math.min(gameState.scrollX, maxScrollX));
      gameState.scrollY = Math.max(0, Math.min(gameState.scrollY, maxScrollY));
      
      // Arrêter quand la vélocité est négligeable
      if (Math.abs(gameState.scrollVelocityX) < 0.1 && Math.abs(gameState.scrollVelocityY) < 0.1) {
        gameState.isInertia = false;
        gameState.scrollVelocityX = 0;
        gameState.scrollVelocityY = 0;
      }
    }
    
    // Animer l'eau (changer de frame toutes les 500ms)
    waterAnimationCounter++;
    if (waterAnimationCounter % 10 === 0) {
      gameState.waterFrame = (gameState.waterFrame + 1) % 3;
    }
    
    // Mettre à jour animations
    Object.keys(gameState.grid).forEach(cellId => {
      const plant = gameState.grid[cellId];
      if (!plant || plant.type === 'water') return;
      
      const elapsed = Date.now() - plant.plantedAt;
      
      // Transitions: seed → sprout → tree (avec durée aléatoire)
      if (plant.type === 'seed' && elapsed >= CONFIG.SEED_DURATION) {
        plant.type = 'sprout';
        plant.stage = 1;
      } else if (plant.type === 'sprout' && elapsed >= plant.growthDuration) {
        plant.type = 'tree';
        plant.stage = 1;
      }
      
      // Animation: 1, 2, 1, 3, 1, 2, 1, 3...
      const cycleDuration = 7000;
      const positionInCycle = elapsed % cycleDuration;
      
      let newStage = 1;
      if (positionInCycle < 1000) newStage = 1;
      else if (positionInCycle < 3000) newStage = 2;
      else if (positionInCycle < 4000) newStage = 1;
      else newStage = 3;
      
      plant.stage = newStage;
    });
    
    // Dessiner
    drawGame();
    
    // Mettre à jour minimap si en train de faire de l'inertie
    if (gameState.isInertia) {
      drawMinimap();
    }
    
    // Mettre à jour compteur
    updateTreeCount();
    
    // Sauvegarder moins souvent
    if (Date.now() - lastSaveTime > 2000) {
      saveGameState();
      lastSaveTime = Date.now();
    }
  }, 50);
}

// ========== MINIMAP ==========
function drawMinimap() {
  if (!minimapCtx || !minimapCanvas) return;
  
  // Remplir le fond noir
  minimapCtx.fillStyle = '#000000';
  minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  
  // Remplir de vert pour les cellules vides
  minimapCtx.fillStyle = '#29600e';
  minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  
  const cellPixelSize = minimapCanvas.width / CONFIG.GRID_SIZE;
  
  // Dessiner l'eau et les plantes
  Object.keys(gameState.grid).forEach(cellId => {
    const cell = gameState.grid[cellId];
    const [row, col] = cellId.split('-').map(Number);
    
    if (row < 0 || row >= CONFIG.GRID_SIZE || col < 0 || col >= CONFIG.GRID_SIZE) return;
    
    const x = col * cellPixelSize;
    const y = row * cellPixelSize;
    const size = cellPixelSize;
    
    if (cell.type === 'water') {
      minimapCtx.fillStyle = '#3a7fd8';
      minimapCtx.fillRect(x, y, size, size);
    } else if (cell.type === 'seed' || cell.type === 'sprout' || cell.type === 'tree') {
      minimapCtx.fillStyle = '#9b59b6';
      minimapCtx.fillRect(x, y, size, size);
    }
  });
  
  // Dessiner le viewport actuel en rose
  const viewportX = gameState.scrollX / CONFIG.CELL_SIZE;
  const viewportY = gameState.scrollY / CONFIG.CELL_SIZE;
  const viewportWidth = canvas.width / CONFIG.CELL_SIZE;
  const viewportHeight = canvas.height / CONFIG.CELL_SIZE;
  
  const minimapCellSize = minimapCanvas.width / CONFIG.GRID_SIZE;
  
  minimapCtx.strokeStyle = '#ff6b9d';
  minimapCtx.lineWidth = 2;
  minimapCtx.strokeRect(
    viewportX * minimapCellSize,
    viewportY * minimapCellSize,
    viewportWidth * minimapCellSize,
    viewportHeight * minimapCellSize
  );
}

// ========== DESSIN ==========
function drawGame() {
  // Fond
  ctx.fillStyle = '#6bb347';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Tuiles herbe et eau
  const grassImg = gameState.images['grass'];
  const waterImg = gameState.images[`eau_${gameState.waterFrame + 1}`];
  const sandImg = gameState.images['sand'];
  
  if (grassImg.complete) {
    const startCol = Math.floor(gameState.scrollX / CONFIG.CELL_SIZE);
    const startRow = Math.floor(gameState.scrollY / CONFIG.CELL_SIZE);
    const endCol = startCol + Math.ceil(canvas.width / CONFIG.CELL_SIZE) + 1;
    const endRow = startRow + Math.ceil(canvas.height / CONFIG.CELL_SIZE) + 1;
    
    for (let row = startRow; row < endRow && row < CONFIG.GRID_SIZE; row++) {
      for (let col = startCol; col < endCol && col < CONFIG.GRID_SIZE; col++) {
        const x = col * CONFIG.CELL_SIZE - gameState.scrollX;
        const y = row * CONFIG.CELL_SIZE - gameState.scrollY;
        const cellId = `${row}-${col}`;
        
        // Dessiner herbe de base
        ctx.drawImage(grassImg, x, y, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
        
        // Si c'est de l'eau
        if (gameState.grid[cellId] && gameState.grid[cellId].type === 'water') {
          // Découper intelligemment dans la texture eau (480x270)
          const srcX = (col % 7) * 64;
          const srcY = (row % 4) * 64;
          
          const quarter = CONFIG.CELL_SIZE / 2;
          
          // Déterminer les voisins cardinaux
          const topNeighbor = row > 0 ? gameState.grid[`${row-1}-${col}`] : null;
          const bottomNeighbor = row < CONFIG.GRID_SIZE - 1 ? gameState.grid[`${row+1}-${col}`] : null;
          const leftNeighbor = col > 0 ? gameState.grid[`${row}-${col-1}`] : null;
          const rightNeighbor = col < CONFIG.GRID_SIZE - 1 ? gameState.grid[`${row}-${col+1}`] : null;
          
          // Déterminer les voisins diagonaux
          const topLeftNeighbor = row > 0 && col > 0 ? gameState.grid[`${row-1}-${col-1}`] : null;
          const topRightNeighbor = row > 0 && col < CONFIG.GRID_SIZE - 1 ? gameState.grid[`${row-1}-${col+1}`] : null;
          const bottomLeftNeighbor = row < CONFIG.GRID_SIZE - 1 && col > 0 ? gameState.grid[`${row+1}-${col-1}`] : null;
          const bottomRightNeighbor = row < CONFIG.GRID_SIZE - 1 && col < CONFIG.GRID_SIZE - 1 ? gameState.grid[`${row+1}-${col+1}`] : null;
          
          // Vérifier si voisin est herbe (pas d'eau)
          // Les bords de la map sont traités comme de l'eau
          const topIsHerb = (row === 0) ? false : (!topNeighbor || topNeighbor.type !== 'water');
          const bottomIsHerb = (row === CONFIG.GRID_SIZE - 1) ? false : (!bottomNeighbor || bottomNeighbor.type !== 'water');
          const leftIsHerb = (col === 0) ? false : (!leftNeighbor || leftNeighbor.type !== 'water');
          const rightIsHerb = (col === CONFIG.GRID_SIZE - 1) ? false : (!rightNeighbor || rightNeighbor.type !== 'water');
          
          const topLeftIsHerb = (row === 0 || col === 0) ? false : (!topLeftNeighbor || topLeftNeighbor.type !== 'water');
          const topRightIsHerb = (row === 0 || col === CONFIG.GRID_SIZE - 1) ? false : (!topRightNeighbor || topRightNeighbor.type !== 'water');
          const bottomLeftIsHerb = (row === CONFIG.GRID_SIZE - 1 || col === 0) ? false : (!bottomLeftNeighbor || bottomLeftNeighbor.type !== 'water');
          const bottomRightIsHerb = (row === CONFIG.GRID_SIZE - 1 || col === CONFIG.GRID_SIZE - 1) ? false : (!bottomRightNeighbor || bottomRightNeighbor.type !== 'water');
          
          const touchesHerb = topIsHerb || bottomIsHerb || leftIsHerb || rightIsHerb || 
                              topLeftIsHerb || topRightIsHerb || bottomLeftIsHerb || bottomRightIsHerb;
          
          if (!touchesHerb) {
            // Étape 1 : Eau pure complète
            if (waterImg && waterImg.complete) {
              ctx.globalAlpha = 0.6;
              ctx.drawImage(waterImg, srcX, srcY, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE, x, y, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
              ctx.globalAlpha = 1.0;
            }
          } else {
            // Étape 2 : Diviser en 4 quarts
            const drawQuarter = (qx, qy, qsrcX, qsrcY, isHerbQuarter) => {
              if (isHerbQuarter) {
                // Sable pur
                if (sandImg && sandImg.complete) {
                  ctx.drawImage(sandImg, qx, qy, quarter, quarter);
                }
              } else {
                // Sable sous l'eau
                if (sandImg && sandImg.complete) {
                  ctx.drawImage(sandImg, qx, qy, quarter, quarter);
                }
                if (waterImg && waterImg.complete) {
                  ctx.globalAlpha = 0.6;
                  ctx.drawImage(waterImg, qsrcX, qsrcY, quarter, quarter, qx, qy, quarter, quarter);
                  ctx.globalAlpha = 1.0;
                }
              }
            };
            
            // Haut-gauche (touche herbe: top, left, ou top-left diagonal)
            const hgIsHerb = topIsHerb || leftIsHerb || topLeftIsHerb;
            drawQuarter(x, y, srcX, srcY, hgIsHerb);
            
            // Haut-droite (touche herbe: top, right, ou top-right diagonal)
            const hdIsHerb = topIsHerb || rightIsHerb || topRightIsHerb;
            drawQuarter(x + quarter, y, srcX + quarter, srcY, hdIsHerb);
            
            // Bas-gauche (touche herbe: bottom, left, ou bottom-left diagonal)
            const bgIsHerb = bottomIsHerb || leftIsHerb || bottomLeftIsHerb;
            drawQuarter(x, y + quarter, srcX, srcY + quarter, bgIsHerb);
            
            // Bas-droite (touche herbe: bottom, right, ou bottom-right diagonal)
            const bdIsHerb = bottomIsHerb || rightIsHerb || bottomRightIsHerb;
            drawQuarter(x + quarter, y + quarter, srcX + quarter, srcY + quarter, bdIsHerb);
          }
        }
        
        // Grille de border
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
      }
    }
  }
  
  // Dessiner les plantes (triées par Y pour effet de profondeur)
  const plantsToRender = Object.keys(gameState.grid)
    .map(cellId => ({
      cellId,
      plant: gameState.grid[cellId],
      row: parseInt(cellId.split('-')[0]),
      col: parseInt(cellId.split('-')[1])
    }))
    .sort((a, b) => a.row - b.row); // Trier par ligne (Y)
  
  plantsToRender.forEach(({ cellId, plant, row, col }) => {
    const x = col * CONFIG.CELL_SIZE - gameState.scrollX;
    const y = row * CONFIG.CELL_SIZE - gameState.scrollY;
    
    // Skip si hors de l'écran
    if (x < -CONFIG.CELL_SIZE || x > canvas.width || 
        y < -CONFIG.CELL_SIZE || y > canvas.height) {
      return;
    }
    
    let imgName, imgSize;
    if (plant.type === 'seed') {
      imgName = 'seeds';
      imgSize = 64;
    } else if (plant.type === 'sprout') {
      imgName = `sprout_${plant.stage}`;
      imgSize = 96;
    } else if (plant.type === 'tree') {
      imgName = `tree_${plant.stage}`;
      imgSize = 128;
    }
    
    const img = gameState.images[imgName];
    if (img && img.complete) {
      // Centrer l'image dans la cellule
      const offsetX = (CONFIG.CELL_SIZE - imgSize) / 2;
      // Décaler uniquement les arbres vers le haut
      const offsetY = (CONFIG.CELL_SIZE - imgSize) / 2 - (plant.type === 'tree' ? 32 : 0);
      
      ctx.drawImage(img, x + offsetX, y + offsetY, imgSize, imgSize);
    }
  });
}

// ========== COMPTEUR ARBRES ==========
function updateTreeCount() {
  // La quête n'existe que en mode partagé (2609)
  if (!gameState.isSharedMode) {
    return;
  }
  
  let treeCount = 0;
  
  Object.keys(gameState.grid).forEach(cellId => {
    const plant = gameState.grid[cellId];
    if (plant && plant.type === 'tree') {
      treeCount++;
    }
  });
  
  const treeCountEl = document.getElementById('treeCount');
  if (treeCountEl) {
    treeCountEl.textContent = treeCount;
  }
  
  if (treeCount >= CONFIG.TREE_GOAL) {
    showValentinePopup();
  }
}

// ========== POPUP VALENTINE ==========
function showValentinePopup() {
  if (gameState.valentineShown) return;
  
  gameState.valentineShown = true;
  const envelope = document.getElementById('envelopeNotification');
  envelope.classList.remove('hidden');
  
  // Clic sur l'enveloppe pour afficher la modal
  envelope.addEventListener('click', openValentineModal);
}

function openValentineModal() {
  const modal = document.getElementById('valentineModal');
  modal.classList.remove('hidden');
  
  const yesBtn = document.getElementById('yesBtn');
  const noBtn = document.getElementById('noBtn');
  
  yesBtn.onclick = () => {
    sendEmail('Oui');
    modal.classList.add('hidden');
    document.getElementById('envelopeNotification').classList.add('hidden');
  };
  
  noBtn.onclick = () => {
    modal.classList.add('hidden');
    document.getElementById('envelopeNotification').classList.add('hidden');
  };
}

// ========== ENVOI EMAIL ==========
function sendEmail(response) {
  const formData = new FormData();
  formData.append('response', response);
  
  fetch('https://formspree.io/f/mojdbjvq', {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json'
    }
  })
  .then(response => {
    if (response.ok) {
      console.log('Email envoyé!');
    } else {
      console.error('Erreur email:', response.status);
    }
  })
  .catch(error => console.error('Erreur:', error));
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  // Animer les pousses du header/modal dès le chargement
  animateSprouts();
  
  setupAuth();
  setupDragDrop();
});

// Animer les pousses (header et modal PIN)
function animateSprouts() {
  const sproutAnimationStartTime = Date.now();
  
  setInterval(() => {
    const elapsed = Date.now() - sproutAnimationStartTime;
    const cycleDuration = 7000; // Même durée que les plantes
    const positionInCycle = elapsed % cycleDuration;
    
    let sproutFrame = 1;
    if (positionInCycle < 1000) sproutFrame = 1;
    else if (positionInCycle < 3000) sproutFrame = 2;
    else if (positionInCycle < 4000) sproutFrame = 1;
    else sproutFrame = 3;
    
    const allSprouts = document.querySelectorAll('.header-sprout');
    allSprouts.forEach(sprout => {
      sprout.src = `assets/img/sprout_${sproutFrame}.png`;
    });
  }, 50);
}
