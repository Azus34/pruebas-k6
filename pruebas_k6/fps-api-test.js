// K6 Load Testing Script for FPS Survival API
import { group, sleep, check } from "k6";
import http from "k6/http";
import { Counter, Trend, Rate } from "k6/metrics";

const playerCreationTime = new Trend("player_creation_time");
const weaponFireTime = new Trend("weapon_fire_time");
const inventoryOperationTime = new Trend("inventory_operation_time");
const successRate = new Rate("success_rate");
const apiErrors = new Counter("api_errors");

export const options = {
  stages: [
    { target: 5, duration: "30s" },
    { target: 10, duration: "1m30s" },
    { target: 5, duration: "30s" },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    http_req_failed: ["rate<0.2"],
    success_rate: ["rate>0.8"],
  },
  cloud: {
    projectID: 5266622,
    name: "FPS Survival API Load Test"
  }
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
let playerId = null;

export default function () {
  healthCheckScenario();
  sleep(0.5);

  getWeaponsScenario();
  sleep(0.5);

  createPlayerScenario();
  sleep(0.5);

  if (playerId) {
    shootWeaponScenario();
    sleep(0.5);
  }

  spawnEnemyScenario();
  sleep(0.5);

  if (playerId) {
    useInventoryScenario();
    sleep(0.5);
  }

  if (playerId) {
    levelUpScenario();
    sleep(0.5);
  }

  getServerStatsScenario();
  sleep(0.5);
}

function healthCheckScenario() {
  group("Health Check", function () {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      "status 200": (r) => r.status === 200,
      "responde rápido": (r) => r.timings.duration < 1000,
    });
    successRate.add(res.status === 200);
  });
}

function getWeaponsScenario() {
  group("Get Weapons", function () {
    const res = http.get(`${BASE_URL}/api/weapons`);
    check(res, {
      "status 200": (r) => r.status === 200,
      "tiene armas": (r) => r.json("weapons.length") >= 0,
    });
    successRate.add(res.status === 200);
  });
}

function createPlayerScenario() {
  group("Create Player", function () {
    const payload = JSON.stringify({
      name: `Player_${Math.floor(Math.random() * 10000)}`,
    });
    const res = http.post(`${BASE_URL}/api/players`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    playerCreationTime.add(res.timings.duration);
    const success = res.status === 201;
    if (success) {
      try {
        playerId = res.json("player.id");
      } catch (e) {}
    }
    check(res, {
      "status 201": (r) => r.status === 201,
    });
    successRate.add(success);
    if (!success) apiErrors.add(1);
  });
}

function shootWeaponScenario() {
  group("Shoot Weapon", function () {
    const weapons = ["pistol", "rifle", "shotgun", "sniper"];
    const weapon = weapons[Math.floor(Math.random() * weapons.length)];
    const payload = JSON.stringify({
      weaponId: weapon,
      targetEnemyId: `enemy_${Math.floor(Math.random() * 1000)}`,
    });
    const res = http.post(`${BASE_URL}/api/players/${playerId}/shoot`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    weaponFireTime.add(res.timings.duration);
    const success = res.status === 200;
    check(res, {
      "status 200": (r) => r.status === 200,
    });
    successRate.add(success);
    if (!success) apiErrors.add(1);
  });
}

function spawnEnemyScenario() {
  group("Spawn Enemy", function () {
    const res = http.post(`${BASE_URL}/api/enemies/spawn`, "{}", {
      headers: { "Content-Type": "application/json" },
    });
    const success = res.status === 201;
    check(res, {
      "status 201": (r) => r.status === 201,
    });
    successRate.add(success);
    if (!success) apiErrors.add(1);
  });
}

function useInventoryScenario() {
  group("Use Inventory Item", function () {
    const items = ["medical_kit", "grenade", "ammo_box"];
    const item = items[Math.floor(Math.random() * items.length)];
    const payload = JSON.stringify({ itemType: item });
    const res = http.post(`${BASE_URL}/api/players/${playerId}/use-item`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    inventoryOperationTime.add(res.timings.duration);
    const success = res.status === 200 || res.status === 400;
    check(res, {
      "status 200 o 400": (r) => r.status === 200 || r.status === 400,
    });
    successRate.add(success);
  });
}

function levelUpScenario() {
  group("Player Level Up", function () {
    const res = http.post(`${BASE_URL}/api/players/${playerId}/level-up`, "{}", {
      headers: { "Content-Type": "application/json" },
    });
    const success = res.status === 200;
    check(res, {
      "status 200": (r) => r.status === 200,
    });
    successRate.add(success);
    if (!success) apiErrors.add(1);
  });
}

function getServerStatsScenario() {
  group("Get Server Stats", function () {
    const res = http.get(`${BASE_URL}/api/stats`);
    check(res, {
      "status 200": (r) => r.status === 200,
      "tiene stats": (r) => r.json("stats") !== null,
    });
    successRate.add(res.status === 200);
  });
}
