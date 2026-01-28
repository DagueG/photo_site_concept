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
  SEED_DURATION: 5000, // 5 secondes en ms
  SPROUT_DURATION: 5000, // 5 secondes supplémentaires en ms (total 10s)
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
  images: {},
  isMapDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragStartScrollX: 0,
  dragStartScrollY: 0,
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
  canvas.addEventListener('mousedown', handleCanvasMouseDown);
  canvas.addEventListener('mousemove', handleCanvasMouseMove);
  canvas.addEventListener('mouseup', handleCanvasMouseUp);
  canvas.addEventListener('mouseleave', handleCanvasMouseUp);
  
  // Redimensionner canvas quand la fenetre change
  window.addEventListener('resize', handleWindowResize);
  
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
    // Ajouter/retirer l'eau (toggle)
    if (gameState.grid[cellId] && gameState.grid[cellId].type === 'water') {
      delete gameState.grid[cellId];
    } else {
      gameState.grid[cellId] = {
        type: 'water'
      };
    }
    saveGameState();
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
  // Les clics ne font rien - utiliser la pelle pour supprimer
}

// ========== DRAG MAP ==========
function handleCanvasMouseDown(e) {
  // Seulement avec le bouton gauche
  if (e.button !== 0) return;
  
  gameState.isMapDragging = true;
  gameState.dragStartX = e.clientX;
  gameState.dragStartY = e.clientY;
  gameState.dragStartScrollX = gameState.scrollX;
  gameState.dragStartScrollY = gameState.scrollY;
  canvas.style.cursor = 'grabbing';
}

function handleCanvasMouseMove(e) {
  if (!gameState.isMapDragging) return;
  
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
  canvas.style.cursor = 'grab';
}

// ========== BOUCLE DE JEU ==========
function startGameLoop() {
  let lastSaveTime = Date.now();
  let waterAnimationCounter = 0;
  
  setInterval(() => {
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
