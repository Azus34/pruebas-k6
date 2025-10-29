import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// ================== OPCIONES DE CARGA ==================
export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: [
      { threshold: 'p(95)<60000', abortOnFail: false },
      { threshold: 'p(99)<80000', abortOnFail: false }
    ],
    http_req_failed: [
      { threshold: 'rate<0.05', abortOnFail: false }
    ]
  },
};

// ================== TEST PRINCIPAL ==================
export default function () {
  const BASE_URL = __ENV.BASE_URL || 'https://fps-api-production.up.railway.app/api';

  // 1️⃣ Health check
  let res = http.get(`${BASE_URL}/health`);
  check(res, { 'Health OK': (r) => r.status === 200 });
  sleep(0.5);

  // 2️⃣ Crear jugador
  res = http.post(`${BASE_URL}/players`, JSON.stringify({ name: 'TestPlayer' }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, { 'Player created': (r) => r.status === 201 });

  const player = res.json().player;
  const playerId = player?.id;
  sleep(0.5);

  // 3️⃣ Obtener jugador e inventario
  res = http.get(`${BASE_URL}/players/${playerId}`);
  check(res, { 'Player fetched': (r) => r.status === 200 });

  res = http.get(`${BASE_URL}/players/${playerId}/inventory`);
  check(res, { 'Inventory fetched': (r) => r.status === 200 });
  sleep(0.5);

  // 4️⃣ Generar enemigo
  res = http.post(`${BASE_URL}/enemies/spawn`, null);
  check(res, { 'Enemy spawned': (r) => r.status === 201 });
  const enemy = res.json().enemy;
  sleep(0.5);

  // 5️⃣ Disparar arma
  res = http.post(
    `${BASE_URL}/players/${playerId}/shoot`,
    JSON.stringify({ weaponId: 'pistol', targetEnemyId: enemy?.id }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(res, { 'Shoot OK': (r) => r.status === 200 });
  sleep(0.5);

  // 6️⃣ Usar items
  const items = ['medical_kit', 'grenade', 'ammo_box'];
  const item = randomItem(items);
  res = http.post(
    `${BASE_URL}/players/${playerId}/use-item`,
    JSON.stringify({ itemType: item }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(res, { 'Item used': (r) => [200, 400].includes(r.status) });
  sleep(0.5);

  // 7️⃣ Subir de nivel
  res = http.post(`${BASE_URL}/players/${playerId}/level-up`);
  check(res, { 'Level up OK': (r) => r.status === 200 });
  sleep(0.5);

  // 8️⃣ Obtener estadísticas y armas
  http.get(`${BASE_URL}/stats`);
  http.get(`${BASE_URL}/weapons`);
  sleep(1);
}

// ================== RESUMEN FINAL ==================
export function handleSummary(data) {
  const failed = [];
  for (const [metricName, metric] of Object.entries(data.metrics)) {
    for (const thrName in metric.thresholds) {
      if (!metric.thresholds[thrName].ok) {
        failed.push({ metric: metricName, threshold: thrName });
      }
    }
  }

  if (failed.length > 0) {
    console.log('⚠️ Thresholds NO cumplidos:');
    failed.forEach((f) => {
      console.log(`   - ${f.metric} (${f.threshold})`);
    });
  } else {
    console.log('✅ Todos los thresholds fueron cumplidos.');
  }

  return {
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}
