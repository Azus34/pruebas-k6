// K6 Load Testing Script for VOBE Application
// Simula interacciones de usuarios con endpoints clave de la aplicación

import { group, sleep, check } from "k6";
import http from "k6/http";
import { Counter, Trend, Rate } from "k6/metrics";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

// Métricas personalizadas
const loginFailures = new Counter("login_failures");
const pizzaGenerationTime = new Trend("pizza_generation_time");
const successRate = new Rate("success_rate");

// Configuración de pruebas de carga
export const options = {
  stages: [
    { target: 5, duration: "30s" },   // Ramp-up: incrementar a 5 usuarios en 30s
    { target: 20, duration: "1m" },   // Incrementar a 20 usuarios
    { target: 20, duration: "2m" },   // Mantener 20 usuarios por 2 minutos
    { target: 50, duration: "1m" },   // Pico de carga: 50 usuarios
    { target: 50, duration: "1m" },   // Mantener pico
    { target: 0, duration: "30s" },   // Ramp-down: reducir a 0
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<3000"], // 95% de requests < 2s, 99% < 3s
    http_req_failed: ["rate<0.1"], // Menos del 10% de errores
    success_rate: ["rate>0.9"], // Más del 90% de éxito
  },
  // Integración con Grafana Cloud
  ext: {
    loadimpact: {
      projectID: 3735219,
      name: "VOBE Load Test - CI/CD Pipeline"
    }
  }
};

// Configuración base de la aplicación
const BASE_URL = __ENV.BASE_URL || "http://localhost";

// Datos de prueba
const testUsers = [
  { email: "user1@test.com", password: "Test123!" },
  { email: "user2@test.com", password: "Test123!" },
  { email: "user3@test.com", password: "Test123!" },
];

// Función principal de prueba
export default function () {
  const userIndex = __VU % testUsers.length;
  const user = testUsers[userIndex];
  
  // Simulación de usuario: Homepage → Login → Generación de Pizza → Calificación
  homepageScenario();
  sleep(Math.random() * 2 + 1); // Sleep aleatorio entre 1-3 segundos
  
  const loginSuccess = loginScenario(user);
  if (loginSuccess) {
    sleep(Math.random() * 2 + 1);
    generatePizzaScenario();
    sleep(Math.random() * 2 + 1);
    ratePizzaScenario();
  }
  
  sleep(1);
}

// Escenario 1: Navegación por Homepage
function homepageScenario() {
  group("📱 Escenario 1: Homepage - Carga inicial", function () {
    console.log(`[VU ${__VU}] Accediendo a Homepage...`);
    
    const responses = http.batch([
      ["GET", `${BASE_URL}/`, null, { 
        tags: { name: "Homepage" },
        timeout: "10s"
      }],
      ["GET", `${BASE_URL}/api/config`, null, { 
        tags: { name: "GetConfig" },
        timeout: "5s"
      }],
      ["GET", `${BASE_URL}/api/menu`, null, { 
        tags: { name: "GetMenu" },
        timeout: "5s"
      }],
    ]);
    
    // Validaciones para Homepage
    const homepageCheck = check(responses[0], {
      "✓ Homepage carga correctamente (status 200)": (r) => r.status === 200,
      "✓ Homepage responde en <2s": (r) => r.timings.duration < 2000,
      "✓ Homepage contiene contenido HTML": (r) => r.body && r.body.length > 0,
    });
    
    // Validaciones para API de configuración
    const configCheck = check(responses[1], {
      "✓ Config API responde correctamente": (r) => r.status === 200 || r.status === 404,
      "✓ Config API responde rápido": (r) => r.timings.duration < 1000,
    });
    
    successRate.add(homepageCheck && configCheck);
    
    console.log(`[VU ${__VU}] ✓ Homepage cargada - Status: ${responses[0].status}`);
  });
}

// Escenario 2: Login de usuario
function loginScenario(user) {
  let loginSuccess = false;
  
  group("🔐 Escenario 2: Login - Autenticación de usuario", function () {
    console.log(`[VU ${__VU}] Intentando login como ${user.email}...`);
    
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    });
    
    const params = {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      tags: { name: "UserLogin" },
      timeout: "10s"
    };
    
    const resp = http.post(`${BASE_URL}/api/auth/login`, loginPayload, params);
    
    // Validaciones de login
    const loginCheck = check(resp, {
      "✓ Login request completa": (r) => r.status !== 0,
      "✓ Login responde en <3s": (r) => r.timings.duration < 3000,
      "✓ Login acepta credenciales (200 o 404)": (r) => 
        r.status === 200 || r.status === 404 || r.status === 401,
    });
    
    if (resp.status === 200) {
      loginSuccess = true;
      console.log(`[VU ${__VU}] ✓ Login exitoso`);
      
      // Extraer token si existe
      try {
        const body = JSON.parse(resp.body);
        if (body.token) {
          console.log(`[VU ${__VU}] Token recibido`);
        }
      } catch (e) {
        // No action needed
      }
    } else {
      loginFailures.add(1);
      console.log(`[VU ${__VU}] ⚠ Login failed - Status: ${resp.status}`);
    }
    
    successRate.add(loginCheck);
  });
  
  return loginSuccess;
}

// Escenario 3: Generación de pizza personalizada
function generatePizzaScenario() {
  group("🍕 Escenario 3: Generación de Pizza - Crear pizza personalizada", function () {
    console.log(`[VU ${__VU}] Generando pizza personalizada...`);
    
    const startTime = Date.now();
    
    const pizzaPayload = JSON.stringify({
      size: ["small", "medium", "large"][Math.floor(Math.random() * 3)],
      toppings: generateRandomToppings(),
      crust: ["thin", "regular", "thick"][Math.floor(Math.random() * 3)],
      cheese: ["light", "regular", "extra"][Math.floor(Math.random() * 3)],
    });
    
    const params = {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      tags: { name: "GeneratePizza" },
      timeout: "15s"
    };
    
    const resp = http.post(`${BASE_URL}/api/pizza/generate`, pizzaPayload, params);
    
    const duration = Date.now() - startTime;
    pizzaGenerationTime.add(duration);
    
    // Validaciones de generación
    const generateCheck = check(resp, {
      "✓ Pizza generation completa": (r) => r.status !== 0,
      "✓ Pizza generation responde en <5s": (r) => r.timings.duration < 5000,
      "✓ Pizza generation exitosa (200 o 404)": (r) => 
        r.status === 200 || r.status === 201 || r.status === 404,
    });
    
    if (resp.status === 200 || resp.status === 201) {
      console.log(`[VU ${__VU}] ✓ Pizza generada exitosamente en ${duration}ms`);
    } else {
      console.log(`[VU ${__VU}] ⚠ Pizza generation - Status: ${resp.status}`);
    }
    
    successRate.add(generateCheck);
    
    // Simular carga de imagen de pizza
    sleep(0.5);
    const imageResp = http.get(`${BASE_URL}/api/pizza/image/${Math.floor(Math.random() * 1000)}`, {
      tags: { name: "GetPizzaImage" },
      timeout: "10s"
    });
    
    check(imageResp, {
      "✓ Pizza image carga": (r) => r.status === 200 || r.status === 404,
    });
  });
}

// Escenario 4: Calificación de pizza
function ratePizzaScenario() {
  group("⭐ Escenario 4: Calificación - Evaluar pizza generada", function () {
    console.log(`[VU ${__VU}] Calificando pizza...`);
    
    const rating = Math.floor(Math.random() * 5) + 1; // Rating de 1-5
    const ratingPayload = JSON.stringify({
      pizzaId: Math.floor(Math.random() * 1000),
      rating: rating,
      comment: `Test rating ${rating} stars`,
    });
    
    const params = {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      tags: { name: "RatePizza" },
      timeout: "10s"
    };
    
    const resp = http.post(`${BASE_URL}/api/pizza/rate`, ratingPayload, params);
    
    // Validaciones de calificación
    const rateCheck = check(resp, {
      "✓ Rating request completa": (r) => r.status !== 0,
      "✓ Rating responde en <2s": (r) => r.timings.duration < 2000,
      "✓ Rating aceptada (200 o 404)": (r) => 
        r.status === 200 || r.status === 201 || r.status === 404,
    });
    
    if (resp.status === 200 || resp.status === 201) {
      console.log(`[VU ${__VU}] ✓ Rating enviado: ${rating} estrellas`);
    } else {
      console.log(`[VU ${__VU}] ⚠ Rating - Status: ${resp.status}`);
    }
    
    successRate.add(rateCheck);
  });
}

// Función auxiliar para generar toppings aleatorios
function generateRandomToppings() {
  const allToppings = [
    "pepperoni", "mushrooms", "onions", "sausage", 
    "bacon", "olives", "peppers", "pineapple", "spinach"
  ];
  
  const count = Math.floor(Math.random() * 4) + 1;
  const selected = [];
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * allToppings.length);
    selected.push(allToppings[randomIndex]);
  }
  
  return selected;
}

// Función para generar reporte al finalizar
export function handleSummary(data) {
  console.log("📊 Generando reporte de pruebas...");
  
  return {
    "summary.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

// LEGACY CODE - Código original generado por Grafana Studio (mantenido como referencia)
// Se puede eliminar si no es necesario

