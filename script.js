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
  SEED_DURATION: 5000, // 5 secondes en ms
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
  
  // Redimensionner canvas quand la fenetre change
  window.addEventListener('resize', handleWindowResize);
  
  // Suivi position souris pour icône flottante
  document.addEventListener('mousemove', handleGlobalMouseMove);
  
  // Bouton Reset
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', handleResetMap);
  }
  
  // Démarrer boucle
  startGameLoop();
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
      // Durée aléatoire entre 10 et 20 secondes
      const randomDuration = 10000 + Math.random() * 10000;
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

function applyToolAction(toolId, cellId) {
  if (toolId === 'seedTool') {
    if (!gameState.grid[cellId]) {
      // Durée aléatoire entre 10 et 20 secondes
      const randomDuration = 10000 + Math.random() * 10000;
      gameState.grid[cellId] = {
        type: 'seed',
        stage: 1,
        plantedAt: Date.now(),
        growthDuration: randomDuration
      };
      saveGameState();
      updateTreeCount();
    }
  } else if (toolId === 'shovelTool') {
    if (gameState.grid[cellId]) {
      delete gameState.grid[cellId];
      saveGameState();
      updateTreeCount();
    }
  } else if (toolId === 'bucketTool') {
    // Ajouter de l'eau seulement sur les cases vides
    if (!gameState.grid[cellId]) {
      gameState.grid[cellId] = {
        type: 'water'
      };
      saveGameState();
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
}

function handleCanvasMouseUp(e) {
  gameState.isMapDragging = false;
  gameState.isToolBrushing = false;
  canvas.style.cursor = 'grab';
  
  // Activer l'inertie (continue jusqu'à vélocité négligeable)
  gameState.isInertia = true;
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
}

function generateRandomWater() {
  // Toujours générer de l'eau (100%)
  
  // Nombre de structures: 3 à 6
  const numStructures = Math.floor(Math.random() * 4) + 3;
  
  for (let i = 0; i < numStructures; i++) {
    const structureType = Math.floor(Math.random() * 3);
    
    if (structureType === 0) {
      // Lac (zone circulaire)
      generateLake();
    } else if (structureType === 1) {
      // Rivière (ligne sinueuse)
      generateRiver();
    } else {
      // Côte (eau le long d'un bord)
      generateCoast();
    }
  }
}

function generateLake() {
  // Point central aléatoire
  const centerCol = Math.floor(Math.random() * CONFIG.GRID_SIZE);
  const centerRow = Math.floor(Math.random() * CONFIG.GRID_SIZE);
  const radius = 8 + Math.floor(Math.random() * 15); // 8 à 23 de rayon (très grands)
  
  for (let row = Math.max(0, centerRow - radius); row <= Math.min(CONFIG.GRID_SIZE - 1, centerRow + radius); row++) {
    for (let col = Math.max(0, centerCol - radius); col <= Math.min(CONFIG.GRID_SIZE - 1, centerCol + radius); col++) {
      const distance = Math.sqrt((row - centerRow) ** 2 + (col - centerCol) ** 2);
      if (distance <= radius && !gameState.grid[`${row}-${col}`]) {
        gameState.grid[`${row}-${col}`] = { type: 'water' };
      }
    }
  }
}

function generateRiver() {
  // Rivière sinueuse du haut vers le bas
  let col = Math.floor(Math.random() * CONFIG.GRID_SIZE);
  const width = 6 + Math.floor(Math.random() * 8); // 6 à 14 de large (très large)
  
  for (let row = 0; row < CONFIG.GRID_SIZE; row++) {
    // Sinuosité: change aléatoirement
    if (Math.random() > 0.6) {
      col += Math.random() > 0.5 ? 1 : -1;
    }
    col = Math.max(0, Math.min(CONFIG.GRID_SIZE - 1, col));
    
    // Placer de l'eau sur la largeur
    for (let w = 0; w < width; w++) {
      const targetCol = Math.min(CONFIG.GRID_SIZE - 1, col + w);
      const cellId = `${row}-${targetCol}`;
      if (!gameState.grid[cellId]) {
        gameState.grid[cellId] = { type: 'water' };
      }
    }
  }
}

function generateCoast() {
  // Côte aléatoire (eau le long d'un bord)
  const side = Math.floor(Math.random() * 4); // 0=haut, 1=bas, 2=gauche, 3=droite
  const thickness = 6 + Math.floor(Math.random() * 12); // 6 à 18 d'épaisseur (très épais)
  
  if (side === 0) {
    // Haut
    for (let row = 0; row < thickness; row++) {
      for (let col = 0; col < CONFIG.GRID_SIZE; col++) {
        if (!gameState.grid[`${row}-${col}`]) {
          gameState.grid[`${row}-${col}`] = { type: 'water' };
        }
      }
    }
  } else if (side === 1) {
    // Bas
    for (let row = CONFIG.GRID_SIZE - thickness; row < CONFIG.GRID_SIZE; row++) {
      for (let col = 0; col < CONFIG.GRID_SIZE; col++) {
        if (!gameState.grid[`${row}-${col}`]) {
          gameState.grid[`${row}-${col}`] = { type: 'water' };
        }
      }
    }
  } else if (side === 2) {
    // Gauche
    for (let row = 0; row < CONFIG.GRID_SIZE; row++) {
      for (let col = 0; col < thickness; col++) {
        if (!gameState.grid[`${row}-${col}`]) {
          gameState.grid[`${row}-${col}`] = { type: 'water' };
        }
      }
    }
  } else {
    // Droite
    for (let row = 0; row < CONFIG.GRID_SIZE; row++) {
      for (let col = CONFIG.GRID_SIZE - thickness; col < CONFIG.GRID_SIZE; col++) {
        if (!gameState.grid[`${row}-${col}`]) {
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
    
    // Mettre à jour compteur
    updateTreeCount();
    
    // Sauvegarder moins souvent
    if (Date.now() - lastSaveTime > 2000) {
      saveGameState();
      lastSaveTime = Date.now();
    }
  }, 50);
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
          const topIsHerb = !topNeighbor || topNeighbor.type !== 'water';
          const bottomIsHerb = !bottomNeighbor || bottomNeighbor.type !== 'water';
          const leftIsHerb = !leftNeighbor || leftNeighbor.type !== 'water';
          const rightIsHerb = !rightNeighbor || rightNeighbor.type !== 'water';
          
          const topLeftIsHerb = !topLeftNeighbor || topLeftNeighbor.type !== 'water';
          const topRightIsHerb = !topRightNeighbor || topRightNeighbor.type !== 'water';
          const bottomLeftIsHerb = !bottomLeftNeighbor || bottomLeftNeighbor.type !== 'water';
          const bottomRightIsHerb = !bottomRightNeighbor || bottomRightNeighbor.type !== 'water';
          
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
  setupAuth();
  setupDragDrop();
});
