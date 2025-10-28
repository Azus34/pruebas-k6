// API para Videojuego FPS de Supervivencia Post-apocalíptico
// Endpoints de prueba para K6 Load Testing

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Simulación de base de datos en memoria
const players = new Map();
const weapons = new Map();
const enemies = new Map();
const inventory = new Map();

// Inicializar algunas armas disponibles
weapons.set('pistol', { id: 'pistol', name: 'Pistola 9mm', damage: 25, ammo: 15 });
weapons.set('rifle', { id: 'rifle', name: 'Rifle de Asalto', damage: 45, ammo: 30 });
weapons.set('shotgun', { id: 'shotgun', name: 'Escopeta', damage: 60, ammo: 8 });
weapons.set('sniper', { id: 'sniper', name: 'Rifle de Francotirador', damage: 80, ammo: 5 });

// ============ ENDPOINT 1: Health Check ============
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'FPS Survival API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ============ ENDPOINT 2: Crear/Obtener Jugador ============
app.post('/api/players', (req, res) => {
  const playerId = uuidv4();
  const newPlayer = {
    id: playerId,
    name: req.body.name || `Player_${playerId.substring(0, 8)}`,
    level: 1,
    experience: 0,
    health: 100,
    armor: 50,
    position: { x: 0, y: 0, z: 0 },
    weapons: ['pistol'],
    createdAt: new Date().toISOString()
  };

  players.set(playerId, newPlayer);
  inventory.set(playerId, {
    playerId,
    medical_kits: 3,
    ammo_boxes: 5,
    grenades: 2
  });

  res.status(201).json({
    success: true,
    player: newPlayer,
    message: 'Player created successfully'
  });
});

// ============ ENDPOINT 3: Obtener Datos del Jugador ============
app.get('/api/players/:playerId', (req, res) => {
  const { playerId } = req.params;
  
  if (!players.has(playerId)) {
    return res.status(404).json({
      success: false,
      message: 'Player not found'
    });
  }

  const player = players.get(playerId);
  const inv = inventory.get(playerId);

  res.status(200).json({
    success: true,
    player,
    inventory: inv
  });
});

// ============ ENDPOINT 4: Disparar Arma ============
app.post('/api/players/:playerId/shoot', (req, res) => {
  const { playerId } = req.params;
  const { weaponId, targetEnemyId } = req.body;

  if (!players.has(playerId)) {
    return res.status(404).json({
      success: false,
      message: 'Player not found'
    });
  }

  const player = players.get(playerId);
  const weapon = weapons.get(weaponId || 'pistol');

  if (!weapon) {
    return res.status(400).json({
      success: false,
      message: 'Weapon not found'
    });
  }

  // Simular disparo con cierta precisión
  const accuracy = Math.random() * 100;
  const isHit = accuracy > 30; // 70% de precisión

  const result = {
    playerId,
    weaponId: weapon.id,
    weaponName: weapon.name,
    damage: weapon.damage,
    hit: isHit,
    accuracy: accuracy.toFixed(2),
    targetEnemyId,
    timestamp: new Date().toISOString()
  };

  // Reducir munición
  weapon.ammo = Math.max(0, weapon.ammo - 1);

  res.status(200).json({
    success: true,
    result
  });
});

// ============ ENDPOINT 5: Generar Enemigos ============
app.post('/api/enemies/spawn', (req, res) => {
  const enemyId = uuidv4();
  const enemyTypes = ['Zombie', 'Mutant', 'Infected', 'Raider'];
  const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

  const newEnemy = {
    id: enemyId,
    type: randomType,
    health: Math.floor(Math.random() * 80) + 20,
    position: {
      x: Math.random() * 100,
      y: Math.random() * 100,
      z: Math.random() * 100
    },
    spawnedAt: new Date().toISOString()
  };

  enemies.set(enemyId, newEnemy);

  res.status(201).json({
    success: true,
    enemy: newEnemy,
    message: `${randomType} spawned successfully`
  });
});

// ============ ENDPOINT 6: Obtener Inventario ============
app.get('/api/players/:playerId/inventory', (req, res) => {
  const { playerId } = req.params;

  if (!inventory.has(playerId)) {
    return res.status(404).json({
      success: false,
      message: 'Inventory not found'
    });
  }

  const inv = inventory.get(playerId);

  res.status(200).json({
    success: true,
    inventory: inv
  });
});

// ============ ENDPOINT 7: Usar Item del Inventario ============
app.post('/api/players/:playerId/use-item', (req, res) => {
  const { playerId } = req.params;
  const { itemType } = req.body;

  if (!inventory.has(playerId)) {
    return res.status(404).json({
      success: false,
      message: 'Inventory not found'
    });
  }

  const inv = inventory.get(playerId);
  const player = players.get(playerId);

  let result = {
    playerId,
    itemUsed: itemType,
    success: false,
    message: ''
  };

  // Validar y usar item
  if (itemType === 'medical_kit' && inv.medical_kits > 0) {
    inv.medical_kits--;
    player.health = Math.min(100, player.health + 50);
    result.success = true;
    result.message = 'Medical kit used. Health restored to ' + player.health;
    result.playerHealth = player.health;
  } else if (itemType === 'grenade' && inv.grenades > 0) {
    inv.grenades--;
    result.success = true;
    result.message = 'Grenade thrown! Damage radius: 20m';
    result.damageCaused = Math.floor(Math.random() * 100) + 30;
  } else if (itemType === 'ammo_box' && inv.ammo_boxes > 0) {
    inv.ammo_boxes--;
    result.success = true;
    result.message = 'Ammo resupplied';
    result.ammoRestored = 60;
  } else {
    result.message = `No ${itemType} available in inventory`;
  }

  const statusCode = result.success ? 200 : 400;
  res.status(statusCode).json(result);
});

// ============ ENDPOINT 8: Subir de Nivel ============
app.post('/api/players/:playerId/level-up', (req, res) => {
  const { playerId } = req.params;

  if (!players.has(playerId)) {
    return res.status(404).json({
      success: false,
      message: 'Player not found'
    });
  }

  const player = players.get(playerId);
  player.level++;
  player.experience = 0;
  player.health = 100;
  player.armor = 50;

  res.status(200).json({
    success: true,
    message: `Player leveled up to ${player.level}!`,
    player
  });
});

// ============ ENDPOINT 9: Obtener Estadísticas del Servidor ============
app.get('/api/stats', (req, res) => {
  res.status(200).json({
    success: true,
    stats: {
      totalPlayers: players.size,
      totalEnemies: enemies.size,
      totalWeapons: weapons.size,
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  });
});

// ============ ENDPOINT 10: Listar Armas Disponibles ============
app.get('/api/weapons', (req, res) => {
  const weaponsList = Array.from(weapons.values());

  res.status(200).json({
    success: true,
    weapons: weaponsList,
    total: weaponsList.length
  });
});

// ============ Error Handler ============
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: err.message
  });
});

// ============ 404 Handler ============
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// ============ Iniciar Servidor ============
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   FPS Survival API - Load Test Server  ║
╚════════════════════════════════════════╝

📍 Server running on: http://localhost:${PORT}
🎮 API Base URL: http://localhost:${PORT}/api

Available Endpoints:
  GET    /api/health
  POST   /api/players
  GET    /api/players/:playerId
  POST   /api/players/:playerId/shoot
  POST   /api/enemies/spawn
  GET    /api/players/:playerId/inventory
  POST   /api/players/:playerId/use-item
  POST   /api/players/:playerId/level-up
  GET    /api/stats
  GET    /api/weapons

Press Ctrl+C to stop the server
  `);
});

module.exports = app;
