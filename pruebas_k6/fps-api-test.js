// K6 Load Testing Script for FPS Survival API
// Pruebas de carga para endpoints del videojuego FPS

import { group, sleep, check } from "k6";
import http from "k6/http";
import { Counter, Trend, Rate } from "k6/metrics";

// Métricas personalizadas
const playerCreationTime = new Trend("player_creation_time");
const weaponFireTime = new Trend("weapon_fire_time");
const inventoryOperationTime = new Trend("inventory_operation_time");
const successRate = new Rate("success_rate");
const apiErrors = new Counter("api_errors");

// Configuración de pruebas de carga
export const options = {
  stages: [
    { target: 5, duration: "30s" },    // Ramp-up: 5 usuarios en 30s
    { target: 10, duration: "1m30s" }, // Incrementar a 10 usuarios
    { target: 5, duration: "30s" },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1500", "p(99)<3000"],
    http_req_failed: ["rate<0.1"],
    success_rate: ["rate>0.95"],
  },
  // Integración con Grafana Cloud
  cloud: {
    projectID: 5266622,
    name: "FPS Survival API Load Test"
  }
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
let playerId = null;

export default function () {
  // Escenario 1: Health Check
  healthCheckScenario();
  sleep(1);

  // Escenario 2: Obtener Armas
  getWeaponsScenario();
  sleep(0.5);

  // Escenario 3: Crear jugador
  createPlayerScenario();
  sleep(1);

  // Escenario 4: Disparar arma
  if (playerId) {
    shootWeaponScenario();
    sleep(0.5);
  }

  // Escenario 5: Generar enemigos
  spawnEnemyScenario();
  sleep(0.5);

  // Escenario 6: Usar inventario
  if (playerId) {
    useInventoryScenario();
    sleep(0.5);
  }

  // Escenario 7: Subir de nivel
  if (playerId) {
    levelUpScenario();
    sleep(0.5);
  }

  // Escenario 8: Obtener estadísticas del servidor
  getServerStatsScenario();
  sleep(1);
}

// ========== ESCENARIO 1: Health Check ==========
function healthCheckScenario() {
  group("🏥 Scenario 1: Health Check", function () {
    const res = http.get(`${BASE_URL}/api/health`);

    const check1 = check(res, {
      "✓ Health check status 200": (r) => r.status === 200,
      "✓ Health check responde rápido": (r) => r.timings.duration < 500,
      "✓ Health check tiene 'ok' status": (r) => r.json("status") === "ok",
    });

    successRate.add(check1);
  });
}

// ========== ESCENARIO 2: Crear Jugador ==========
function createPlayerScenario() {
  group("👤 Scenario 2: Create Player", function () {
    const startTime = Date.now();

    const payload = JSON.stringify({
      name: `Player_${Math.floor(Math.random() * 10000)}`,
    });

    const res = http.post(`${BASE_URL}/api/players`, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      tags: { name: "CreatePlayer" },
    });

    const duration = Date.now() - startTime;
    playerCreationTime.add(duration);

    const check1 = check(res, {
      "✓ Player creation status 201": (r) => r.status === 201,
      "✓ Player creation responde rápido": (r) => r.timings.duration < 1000,
      "✓ Player creation retorna ID": (r) => {
        try {
          const body = JSON.parse(r.body);
          playerId = body.player.id;
          return playerId !== null && playerId !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    if (!check1) {
      apiErrors.add(1);
    }

    successRate.add(check1);
  });
}

// ========== ESCENARIO 3: Disparar Arma ==========
function shootWeaponScenario() {
  group("🔫 Scenario 3: Shoot Weapon", function () {
    const startTime = Date.now();

    const weapons = ["pistol", "rifle", "shotgun", "sniper"];
    const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)];

    const payload = JSON.stringify({
      weaponId: randomWeapon,
      targetEnemyId: `enemy_${Math.floor(Math.random() * 1000)}`,
    });

    const res = http.post(
      `${BASE_URL}/api/players/${playerId}/shoot`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        tags: { name: "ShootWeapon" },
      }
    );

    const duration = Date.now() - startTime;
    weaponFireTime.add(duration);

    const check1 = check(res, {
      "✓ Shoot status 200": (r) => r.status === 200,
      "✓ Shoot responde rápido": (r) => r.timings.duration < 1000,
      "✓ Shoot tiene resultado": (r) => r.json("result") !== null,
    });

    if (!check1) {
      apiErrors.add(1);
    }

    successRate.add(check1);
  });
}

// ========== ESCENARIO 4: Generar Enemigo ==========
function spawnEnemyScenario() {
  group("👹 Scenario 4: Spawn Enemy", function () {
    const res = http.post(`${BASE_URL}/api/enemies/spawn`, "{}", {
      headers: {
        "Content-Type": "application/json",
      },
      tags: { name: "SpawnEnemy" },
    });

    const check1 = check(res, {
      "✓ Enemy spawn status 201": (r) => r.status === 201,
      "✓ Enemy spawn responde": (r) => r.timings.duration < 1000,
      "✓ Enemy tiene ID": (r) => r.json("enemy.id") !== null,
    });

    if (!check1) {
      apiErrors.add(1);
    }

    successRate.add(check1);
  });
}

// ========== ESCENARIO 5: Usar Inventario ==========
function useInventoryScenario() {
  group("🎒 Scenario 5: Use Inventory Item", function () {
    const startTime = Date.now();

    const items = ["medical_kit", "grenade", "ammo_box"];
    const randomItem = items[Math.floor(Math.random() * items.length)];

    const payload = JSON.stringify({
      itemType: randomItem,
    });

    const res = http.post(
      `${BASE_URL}/api/players/${playerId}/use-item`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        tags: { name: "UseInventory" },
      }
    );

    const duration = Date.now() - startTime;
    inventoryOperationTime.add(duration);

    const check1 = check(res, {
      "✓ Inventory operation status 200/400": (r) => 
        r.status === 200 || r.status === 400,
      "✓ Inventory operation responde": (r) => r.timings.duration < 1000,
      "✓ Inventory retorna resultado": (r) => r.json("result") !== null || r.json("success") !== null,
    });

    if (res.status >= 400) {
      apiErrors.add(1);
    }

    successRate.add(check1);
  });
}

// ========== ESCENARIO 6: Obtener Estadísticas ==========
function getServerStatsScenario() {
  group("📊 Scenario 6: Get Server Stats", function () {
    const res = http.get(`${BASE_URL}/api/stats`);

    const check1 = check(res, {
      "✓ Stats status 200": (r) => r.status === 200,
      "✓ Stats responden rápido": (r) => r.timings.duration < 500,
      "✓ Stats tienen datos": (r) => r.json("stats") !== null,
      "✓ Stats muestran jugadores": (r) => r.json("stats.totalPlayers") >= 0,
    });

    successRate.add(check1);
  });
}

// ========== ESCENARIO 7: Obtener Armas Disponibles ==========
function getWeaponsScenario() {
  group("🔧 Scenario 7: Get Available Weapons", function () {
    const res = http.get(`${BASE_URL}/api/weapons`);

    const check1 = check(res, {
      "✓ Weapons list status 200": (r) => r.status === 200,
      "✓ Weapons responden rápido": (r) => r.timings.duration < 500,
      "✓ Weapons tienen armas": (r) => r.json("weapons.length") >= 0,
    });

    successRate.add(check1);
  });
}

// ========== ESCENARIO 8: Subir de Nivel ==========
function levelUpScenario() {
  group("⬆️ Scenario 8: Player Level Up", function () {
    if (!playerId) return;

    const res = http.post(`${BASE_URL}/api/players/${playerId}/level-up`, "{}", {
      headers: {
        "Content-Type": "application/json",
      },
      tags: { name: "LevelUp" },
    });

    const check1 = check(res, {
      "✓ Level up status 200": (r) => r.status === 200,
      "✓ Level up responde": (r) => r.timings.duration < 1000,
      "✓ Player existe": (r) => r.json("player") !== null,
    });

    if (!check1) {
      apiErrors.add(1);
    }

    successRate.add(check1);
  });
}
