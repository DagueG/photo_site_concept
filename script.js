/**
 * Valentine Garden - Canvas Version
 * Optimisée avec Canvas pour meilleure performance
 */

// Configuration
const CONFIG = {
  PIN: '1234',
  GRID_SIZE: 100,
  CELL_SIZE: 64,
  TREE_GOAL: 14,
  SPROUT_DURATION: 10000, // 1 heure en ms
  TREE_DURATION: 60000, // 10 minutes en ms (pour test)
  EMAIL: 'daniel.guedj.pro@gmail.com'
};

// State
const gameState = {
  grid: {},
  draggedTool: null,
  isAuthenticated: false,
  valentineShown: false,
  scrollX: 0,
  scrollY: 0,
  images: {}
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
    gameState.isAuthenticated = true;
    document.getElementById('pinModal').classList.add('hidden');
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
  localStorage.setItem('valentineGrid', JSON.stringify(gameState.grid));
}

function loadGameState() {
  const saved = localStorage.getItem('valentineGrid');
  if (saved) {
    gameState.grid = JSON.parse(saved);
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
  
  // Démarrer boucle
  startGameLoop();
}

// ========== CHARGEMENT ASSETS ==========
function loadAssets() {
  const assets = [
    'grass', 'seeds', 'shovel',
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
  
  [seedTool, shovelTool].forEach(tool => {
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
      gameState.grid[cellId] = {
        type: 'sprout',
        stage: 1,
        plantedAt: Date.now()
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
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left + gameState.scrollX;
  const y = e.clientY - rect.top + gameState.scrollY;
  
  const col = Math.floor(x / CONFIG.CELL_SIZE);
  const row = Math.floor(y / CONFIG.CELL_SIZE);
  
  if (row < 0 || row >= CONFIG.GRID_SIZE || col < 0 || col >= CONFIG.GRID_SIZE) {
    return;
  }
  
  const cellId = `${row}-${col}`;
  if (gameState.grid[cellId]) {
    // Clic sur plante = retirer avec pelle
    delete gameState.grid[cellId];
    saveGameState();
    updateTreeCount();
  }
}

// ========== BOUCLE DE JEU ==========
function startGameLoop() {
  let lastSaveTime = Date.now();
  
  setInterval(() => {
    // Mettre à jour animations
    Object.keys(gameState.grid).forEach(cellId => {
      const plant = gameState.grid[cellId];
      if (!plant) return;
      
      const elapsed = Date.now() - plant.plantedAt;
      
      // Transition sprout → tree
      if (plant.type === 'sprout' && elapsed >= CONFIG.SPROUT_DURATION) {
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
  
  // Tuiles herbe
  const grassImg = gameState.images['grass'];
  if (grassImg.complete) {
    const startCol = Math.floor(gameState.scrollX / CONFIG.CELL_SIZE);
    const startRow = Math.floor(gameState.scrollY / CONFIG.CELL_SIZE);
    const endCol = startCol + Math.ceil(canvas.width / CONFIG.CELL_SIZE) + 1;
    const endRow = startRow + Math.ceil(canvas.height / CONFIG.CELL_SIZE) + 1;
    
    for (let row = startRow; row < endRow && row < CONFIG.GRID_SIZE; row++) {
      for (let col = startCol; col < endCol && col < CONFIG.GRID_SIZE; col++) {
        const x = col * CONFIG.CELL_SIZE - gameState.scrollX;
        const y = row * CONFIG.CELL_SIZE - gameState.scrollY;
        
        ctx.drawImage(grassImg, x, y, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
        
        // Grille de border
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
      }
    }
  }
  
  // Dessiner les plantes
  Object.keys(gameState.grid).forEach(cellId => {
    const plant = gameState.grid[cellId];
    const [row, col] = cellId.split('-').map(Number);
    
    const x = col * CONFIG.CELL_SIZE - gameState.scrollX;
    const y = row * CONFIG.CELL_SIZE - gameState.scrollY;
    
    // Skip si hors de l'écran
    if (x < -CONFIG.CELL_SIZE || x > canvas.width || 
        y < -CONFIG.CELL_SIZE || y > canvas.height) {
      return;
    }
    
    const imgName = plant.type === 'sprout' 
      ? `sprout_${plant.stage}`
      : `tree_${plant.stage}`;
    
    const img = gameState.images[imgName];
    if (img && img.complete) {
      // Centrer l'image dans la cellule
      const imgSize = plant.type === 'sprout' ? 96 : 128;
      const offsetX = (CONFIG.CELL_SIZE - imgSize) / 2;
      const offsetY = (CONFIG.CELL_SIZE - imgSize) / 2;
      
      ctx.drawImage(img, x + offsetX, y + offsetY, imgSize, imgSize);
    }
  });
}

// ========== COMPTEUR ARBRES ==========
function updateTreeCount() {
  let treeCount = 0;
  
  Object.keys(gameState.grid).forEach(cellId => {
    const plant = gameState.grid[cellId];
    if (plant && plant.type === 'tree') {
      const elapsed = Date.now() - plant.plantedAt;
      if (elapsed >= CONFIG.TREE_DURATION) {
        treeCount++;
      }
    }
  });
  
  const treeCountEl = document.getElementById('treeCount');
  if (treeCountEl) {
    const currentCount = parseInt(treeCountEl.textContent);
    if (currentCount !== treeCount) {
      treeCountEl.textContent = treeCount;
    }
  }
  
  if (treeCount >= CONFIG.TREE_GOAL) {
    showValentinePopup();
  }
}

// ========== POPUP VALENTINE ==========
function showValentinePopup() {
  if (gameState.valentineShown) return;
  
  const modal = document.getElementById('valentineModal');
  if (modal.classList.contains('hidden')) {
    gameState.valentineShown = true;
    modal.classList.remove('hidden');
    
    const yesBtn = document.getElementById('yesBtn');
    const noBtn = document.getElementById('noBtn');
    
    yesBtn.onclick = () => {
      sendEmail('Oui');
      modal.classList.add('hidden');
    };
    
    noBtn.onclick = () => {
      modal.classList.add('hidden');
    };
  }
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
