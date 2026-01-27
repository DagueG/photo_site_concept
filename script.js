/**
 * Valentine Garden - Game Logic
 * Grille 100x100, drag & drop, timestamps, animations
 */

// Configuration
const CONFIG = {
  PIN: '1234',
  GRID_SIZE: 100,
  TREE_GOAL: 14,
  SPROUT_DURATION: 3600000, // 1 heure en ms
  TREE_DURATION: 86400000, // 24 heures en ms
  ANIMATION_SPEED: 1000, // ms par frame
  EMAIL: 'daniel.guedj.pro@gmail.com'
};

// State
const gameState = {
  grid: {}, // { "row-col": { type, plantedAt, ... } }
  draggedTool: null,
  isAuthenticated: false,
  valentineShown: false
};

// ========== AUTHENTIFICATION ==========
function setupAuth() {
  const pinInput = document.getElementById('pinInput');
  const pinSubmit = document.getElementById('pinSubmit');
  
  // Entrée directe du PIN avec Entrée
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

// ========== INITIALISATION GRILLE ==========
function initGame() {
  const gameGrid = document.getElementById('gameGrid');
  gameGrid.innerHTML = '';
  
  for (let row = 0; row < CONFIG.GRID_SIZE; row++) {
    for (let col = 0; col < CONFIG.GRID_SIZE; col++) {
      const cellId = `${row}-${col}`;
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.id = cellId;
      cell.dataset.row = row;
      cell.dataset.col = col;
      
      // Ajouter plante si elle existe
      if (gameState.grid[cellId]) {
        addPlantToCell(cell, cellId);
      }
      
      // Event listeners drag & drop
      cell.addEventListener('dragover', handleDragOver);
      cell.addEventListener('drop', (e) => handleDrop(e, cellId));
      cell.addEventListener('dragleave', handleDragLeave);
      
      gameGrid.appendChild(cell);
    }
  }
  
  // Démarrer boucle d'animation
  startAnimationLoop();
  
  // Mettre à jour le compteur
  updateTreeCount();
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

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e, cellId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  if (!gameState.draggedTool) return;
  
  const cell = document.getElementById(cellId);
  
  if (gameState.draggedTool === 'seedTool') {
    // Planter une graine
    if (!gameState.grid[cellId]) {
      gameState.grid[cellId] = {
        type: 'sprout',
        stage: 1,
        plantedAt: Date.now()
      };
      addPlantToCell(cell, cellId);
      saveGameState();
      updateTreeCount();
    }
  } else if (gameState.draggedTool === 'shovelTool') {
    // Retirer une plante
    if (gameState.grid[cellId]) {
      delete gameState.grid[cellId];
      cell.classList.remove('has-plant');
      cell.innerHTML = '';
      saveGameState();
      updateTreeCount();
    }
  }
}

// ========== GESTION PLANTES ==========
function addPlantToCell(cell, cellId) {
  const plant = gameState.grid[cellId];
  if (!plant) return;
  
  cell.classList.add('has-plant');
  cell.innerHTML = '';
  
  const plantDiv = document.createElement('div');
  plantDiv.className = 'plant';
  plantDiv.dataset.cellId = cellId;
  
  const img = document.createElement('img');
  img.dataset.type = plant.type;
  img.dataset.stage = plant.stage;
  updatePlantImage(img, plant);
  
  // Clic pour retirer rapidement
  plantDiv.addEventListener('click', (e) => {
    e.stopPropagation();
    const shovelTool = document.getElementById('shovelTool');
    gameState.draggedTool = 'shovelTool';
    handleDrop(e, cellId);
    gameState.draggedTool = null;
  });
  
  plantDiv.appendChild(img);
  cell.appendChild(plantDiv);
}

function updatePlantImage(img, plant) {
  if (plant.type === 'sprout') {
    img.src = `assets/img/sprout_${plant.stage}.png`;
  } else if (plant.type === 'tree') {
    img.src = `assets/img/tree_${plant.stage}.png`;
  }
}

// ========== ANIMATION & TIMESTAMPS ==========
function startAnimationLoop() {
  let updateCounter = 0;
  
  setInterval(() => {
    Object.keys(gameState.grid).forEach(cellId => {
      const plant = gameState.grid[cellId];
      if (!plant) return;
      
      const elapsed = Date.now() - plant.plantedAt;
      const cell = document.getElementById(cellId);
      if (!cell) return;
      
      // Transition sprout → tree après 1h
      if (plant.type === 'sprout' && elapsed >= CONFIG.SPROUT_DURATION) {
        plant.type = 'tree';
        plant.stage = 1;
        saveGameState();
        updatePlantInCell(cell, plant);
      }
      
      // Animation frames: 1, 2, 3, 1, 2, 3...
      if (plant.type === 'sprout') {
        const frameTime = (elapsed % (CONFIG.ANIMATION_SPEED * 3));
        const frame = Math.floor(frameTime / CONFIG.ANIMATION_SPEED) + 1;
        plant.stage = Math.min(3, Math.max(1, frame));
      } else if (plant.type === 'tree') {
        const treeElapsed = elapsed - CONFIG.SPROUT_DURATION;
        const frameTime = (treeElapsed % (CONFIG.ANIMATION_SPEED * 3));
        const frame = Math.floor(frameTime / CONFIG.ANIMATION_SPEED) + 1;
        plant.stage = Math.min(3, Math.max(1, frame));
      }
      
      updatePlantInCell(cell, plant);
    });
    
    // Mettre à jour le compteur d'arbres tous les 5 ticks
    updateCounter++;
    if (updateCounter >= 5) {
      updateTreeCount();
      updateCounter = 0;
    }
  }, 100);
}

function updatePlantInCell(cell, plant) {
  const plantDiv = cell.querySelector('.plant');
  if (!plantDiv) return;
  
  const img = plantDiv.querySelector('img');
  if (img) {
    updatePlantImage(img, plant);
  }
}

// ========== COMPTEUR ARBRES ==========
function updateTreeCount() {
  let treeCount = 0;
  
  Object.keys(gameState.grid).forEach(cellId => {
    const plant = gameState.grid[cellId];
    if (plant && plant.type === 'tree') {
      // Un arbre compte que s'il a vécu 24h
      const elapsed = Date.now() - plant.plantedAt;
      if (elapsed >= CONFIG.TREE_DURATION) {
        treeCount++;
      }
    }
  });
  
  const treeCountEl = document.getElementById('treeCount');
  if (treeCountEl) {
    treeCountEl.textContent = treeCount;
  }
  
  // Vérifier si on a atteint 14 arbres
  if (treeCount >= CONFIG.TREE_GOAL) {
    showValentinePopup();
  }
}

// ========== POPUP VALENTINE ==========
function showValentinePopup() {
  if (gameState.valentineShown) return; // Ne pas afficher 2 fois
  
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
  // Créer un formdata pour envoyer à FormSubmit
  // Tu dois remplacer "your-form-id" par ton vrai ID de FormSubmit
  const formData = new FormData();
  formData.append('response', response);
  formData.append('_cc', CONFIG.EMAIL);
  
  fetch('https://formspree.io/f/YOUR_FORM_ID', {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json'
    }
  })
  .then(response => {
    if (response.ok) {
      console.log('Email envoyé avec succès!');
    }
  })
  .catch(error => console.error('Erreur:', error));
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupDragDrop();
});
