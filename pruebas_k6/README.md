# 🚀 Pipeline de Pruebas de Carga con K6, GitHub Actions y Grafana

## 📋 Tabla de Contenido
- [Descripción General](#descripción-general)
- [Script de Pruebas K6](#script-de-pruebas-k6)
- [Configuración de Integración](#configuración-de-integración)
- [Workflow de GitHub Actions](#workflow-de-github-actions)
- [Ejecución y Visualización](#ejecución-y-visualización)
- [Métricas y Thresholds](#métricas-y-thresholds)

---

## 📖 Descripción General

Este proyecto implementa un pipeline completo de pruebas de carga automatizadas utilizando:

- **K6**: Herramienta de testing de carga moderna y de código abierto
- **GitHub Actions**: Plataforma CI/CD para automatización de pruebas
- **Grafana Cloud**: Visualización y análisis de métricas en tiempo real

### 🎯 Objetivos

1. Simular carga de usuarios concurrentes en la aplicación VOBE
2. Validar el rendimiento de endpoints críticos
3. Detectar cuellos de botella y problemas de escalabilidad
4. Generar reportes automáticos de cada ejecución

---

## 📝 Script de Pruebas K6

### Ubicación
- **Archivo**: `pruebas_k6/my-script.js`

### 🔍 Estructura del Script

El script simula el flujo completo de un usuario real interactuando con la aplicación:

```javascript
// Flujo de Usuario
1. 📱 Homepage - Carga inicial
2. 🔐 Login - Autenticación
3. 🍕 Generación de Pizza - Crear pizza personalizada
4. ⭐ Calificación - Evaluar pizza generada
```

### 📊 Escenarios de Prueba

#### **Escenario 1: Homepage - Carga Inicial**
```javascript
function homepageScenario() {
  // Simula la carga inicial de la aplicación
  - GET / (Homepage principal)
  - GET /api/config (Configuración)
  - GET /api/menu (Menú de pizzas)
  
  ✓ Validaciones:
    - Status code 200
    - Tiempo de respuesta < 2s
    - Contenido HTML válido
}
```

**Endpoints probados:**
- `GET ${BASE_URL}/` - Página principal
- `GET ${BASE_URL}/api/config` - Configuración de la app
- `GET ${BASE_URL}/api/menu` - Menú disponible

#### **Escenario 2: Login - Autenticación de Usuario**
```javascript
function loginScenario(user) {
  // Simula el proceso de autenticación
  POST /api/auth/login
  {
    email: "user@test.com",
    password: "Test123!"
  }
  
  ✓ Validaciones:
    - Request completa
    - Tiempo de respuesta < 3s
    - Status 200/401/404 aceptable
    - Token JWT recibido (si 200)
}
```

**Endpoints probados:**
- `POST ${BASE_URL}/api/auth/login` - Autenticación

#### **Escenario 3: Generación de Pizza Personalizada**
```javascript
function generatePizzaScenario() {
  // Simula la creación de una pizza custom
  POST /api/pizza/generate
  {
    size: "medium",
    toppings: ["pepperoni", "mushrooms"],
    crust: "thin",
    cheese: "regular"
  }
  
  ✓ Validaciones:
    - Request completa
    - Tiempo de respuesta < 5s
    - Status 200/201/404 aceptable
    - Imagen de pizza disponible
}
```

**Endpoints probados:**
- `POST ${BASE_URL}/api/pizza/generate` - Generar pizza
- `GET ${BASE_URL}/api/pizza/image/{id}` - Cargar imagen

#### **Escenario 4: Calificación de Pizza**
```javascript
function ratePizzaScenario() {
  // Simula el rating de una pizza
  POST /api/pizza/rate
  {
    pizzaId: 123,
    rating: 5,
    comment: "Excelente pizza!"
  }
  
  ✓ Validaciones:
    - Request completa
    - Tiempo de respuesta < 2s
    - Status 200/201/404 aceptable
}
```

**Endpoints probados:**
- `POST ${BASE_URL}/api/pizza/rate` - Calificar pizza

### ⚙️ Configuración de Carga

```javascript
export const options = {
  stages: [
    { target: 5, duration: "30s" },   // Warm-up: 5 usuarios
    { target: 20, duration: "1m" },   // Ramp-up: 20 usuarios
    { target: 20, duration: "2m" },   // Steady: 20 usuarios
    { target: 50, duration: "1m" },   // Peak: 50 usuarios
    { target: 50, duration: "1m" },   // Hold peak
    { target: 0, duration: "30s" },   // Cool-down
  ]
};
```

**Total de la prueba:** ~6 minutos  
**Usuarios máximos simultáneos:** 50  
**Patrón:** Ramp-up gradual → Pico → Ramp-down

### 📈 Métricas Personalizadas

```javascript
const loginFailures = new Counter("login_failures");      // Conteo de logins fallidos
const pizzaGenerationTime = new Trend("pizza_generation_time");  // Tiempo de generación
const successRate = new Rate("success_rate");             // Tasa de éxito general
```

### 🎯 Thresholds Definidos

```javascript
thresholds: {
  http_req_duration: ["p(95)<2000", "p(99)<3000"],  // 95% < 2s, 99% < 3s
  http_req_failed: ["rate<0.1"],                     // < 10% de errores
  success_rate: ["rate>0.9"]                         // > 90% de éxito
}
```

---

## 🔧 Configuración de Integración

### 1️⃣ Configurar Grafana Cloud K6

#### Paso 1: Crear cuenta en Grafana Cloud
1. Visita: https://grafana.com/
2. Crea una cuenta gratuita o inicia sesión
3. Navega a la aplicación K6

#### Paso 2: Obtener Token de API
```bash
# En Grafana Cloud → Settings → API Tokens
1. Click en "Generate API Token"
2. Nombre: "GitHub Actions CI/CD"
3. Permisos: "Write" para K6
4. Copiar el token generado
```

📸 **Captura requerida:** Pantalla de configuración de API Token en Grafana

#### Paso 3: Verificar Project ID
```javascript
// El Project ID se encuentra en la URL de Grafana Cloud
// Ejemplo: https://azus34.grafana.net/a/k6-app/projects/3735219
//                                                          ^^^^^^^^
//                                                       Project ID
```

### 2️⃣ Configurar GitHub Repository

#### Paso 1: Agregar Secrets
```bash
# En GitHub → Settings → Secrets and variables → Actions

Nombre: K6_CLOUD_TOKEN
Valor: [tu-token-de-grafana-cloud]
```

📸 **Captura requerida:** Pantalla de GitHub Secrets configurados

#### Paso 2: Estructura de Archivos
```
VOBE/
├── .github/
│   └── workflows/
│       └── k6-load-test.yml    # ← Workflow CI/CD
├── pruebas_k6/
│   ├── my-script.js            # ← Script de pruebas
│   └── README.md               # ← Esta documentación
└── [otros archivos del proyecto]
```

### 3️⃣ Conectar GitHub con Grafana Cloud

#### Flujo de Integración

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   GitHub    │  Push   │    GitHub    │  K6 Run │   Grafana    │
│ Repository  ├────────>│   Actions    ├────────>│    Cloud     │
└─────────────┘         └──────────────┘         └──────────────┘
                              │                          │
                              └──────────────────────────┘
                              Resultados automáticos
```

#### Configuración del Script
```javascript
// En my-script.js
export const options = {
  ext: {
    loadimpact: {
      projectID: 3735219,  // ← Tu Project ID
      name: "VOBE Load Test - CI/CD Pipeline"
    }
  }
};
```

📸 **Captura requerida:** Pantalla de Grafana mostrando el proyecto configurado

---

## 🤖 Workflow de GitHub Actions

### Ubicación
- **Archivo**: `.github/workflows/k6-load-test.yml`

### 📋 Contenido del Workflow

```yaml
name: K6 Load Testing Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:  # Ejecución manual
```

### 🔄 Triggers (Disparadores)

| Evento | Descripción |
|--------|-------------|
| `push` | Se ejecuta automáticamente al hacer push a `main` o `develop` |
| `pull_request` | Se ejecuta en cada PR hacia `main` |
| `workflow_dispatch` | Permite ejecución manual desde GitHub UI |

### 📦 Jobs del Pipeline

#### **Job 1: k6_load_test**

```yaml
steps:
  1. 📥 Checkout del repositorio
  2. 🔧 Configurar Node.js
  3. 📦 Instalar K6
  4. ✅ Verificar instalación
  5. 🎯 Configurar variables de entorno
  6. 🚀 Ejecutar pruebas K6
  7. 📊 Generar reporte HTML
  8. 📤 Subir resultados como artefacto
  9. 📈 Publicar comentario en PR
  10. ✅ Mostrar resultado final
```

#### **Job 2: validate_thresholds**

```yaml
steps:
  1. 📥 Descargar resultados del job anterior
  2. 🔍 Analizar y validar thresholds
  3. ❌ Fallar el build si no se cumplen
```

### 🎮 Ejecución Manual

Puedes ejecutar el workflow manualmente con parámetros personalizados:

```yaml
workflow_dispatch:
  inputs:
    base_url:
      description: 'URL de la aplicación'
      default: 'http://localhost'
    test_duration:
      description: 'Duración de la prueba'
      options: [quick, standard, extended]
```

📸 **Captura requerida:** Pantalla de GitHub Actions mostrando ejecución manual

### 📦 Instalación de K6

```bash
# El workflow instala K6 automáticamente en Ubuntu
sudo gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### 🔐 Uso de Secrets

```yaml
# Condicional: ejecuta en Grafana Cloud si hay token
- name: ☁️ Ejecutar en Grafana Cloud
  if: ${{ secrets.K6_CLOUD_TOKEN }}
  run: k6 cloud my-script.js
  env:
    K6_CLOUD_TOKEN: ${{ secrets.K6_CLOUD_TOKEN }}
```

### 📤 Artefactos Generados

El workflow guarda automáticamente:

```
Artifacts (30 días de retención):
├── summary.html      # Reporte HTML visual
└── results.json      # Datos crudos en JSON
```

---

## 🎯 Ejecución y Visualización

### 🖥️ Ejecución Local

#### Prerequisitos
```bash
# Instalar K6
# Windows (con Chocolatey)
choco install k6

# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Ejecutar pruebas

```bash
# Opción 1: Prueba local simple
cd pruebas_k6
k6 run my-script.js

# Opción 2: Con URL personalizada
k6 run -e BASE_URL=https://mi-app.com my-script.js

# Opción 3: Enviar a Grafana Cloud
export K6_CLOUD_TOKEN=tu-token-aqui
k6 cloud my-script.js

# Opción 4: Con más usuarios virtuales
k6 run --vus 100 --duration 5m my-script.js
```

### ☁️ Ejecución en GitHub Actions

#### Método 1: Push a la rama
```bash
git add .
git commit -m "feat: actualizar pruebas de carga"
git push origin main
# ✓ El workflow se ejecuta automáticamente
```

📸 **Captura requerida:** GitHub Actions - Tab "Actions" mostrando ejecución

#### Método 2: Ejecución manual
```
1. Ir a GitHub → Actions
2. Seleccionar "K6 Load Testing Pipeline"
3. Click en "Run workflow"
4. Configurar parámetros (opcional)
5. Click en "Run workflow"
```

### 📊 Visualización en Grafana Cloud

#### Acceder al Dashboard

```
URL: https://azus34.grafana.net/a/k6-app/runs/5854582
```

#### Métricas Disponibles

```
Dashboard de Grafana Cloud incluye:

📈 Métricas HTTP
  - http_reqs: Requests por segundo
  - http_req_duration: Tiempo de respuesta (p50, p95, p99)
  - http_req_failed: Tasa de errores

👥 Virtual Users
  - vus: Usuarios virtuales activos
  - vus_max: Pico de usuarios

🎯 Checks
  - checks: Validaciones exitosas/fallidas
  - success_rate: Tasa de éxito personalizada

⚡ Custom Metrics
  - login_failures: Fallos de autenticación
  - pizza_generation_time: Tiempo de generación
```

📸 **Captura requerida:** Dashboard de Grafana mostrando métricas de la prueba

#### Filtros y Análisis

```javascript
// En Grafana puedes filtrar por:
- Tags: { name: "UserLogin" }
- Groups: "Escenario 1: Homepage"
- Time range: Últimos 7 días
- Percentiles: p50, p90, p95, p99
```

### 📋 Interpretación de Resultados

#### ✅ Prueba Exitosa
```
✓ http_req_duration (p95) < 2000ms    ✓
✓ http_req_failed < 10%                ✓
✓ success_rate > 90%                   ✓
✓ Todos los checks pasaron             ✓
```

#### ❌ Prueba Fallida
```
✗ http_req_duration (p95) = 3542ms    ✗ Threshold violated
✗ http_req_failed = 15.3%             ✗ Too many errors
✓ success_rate = 91.2%                ✓ OK
```

**Acciones recomendadas:**
1. Revisar logs de la aplicación
2. Verificar capacidad del servidor
3. Optimizar queries de base de datos
4. Implementar caching
5. Escalar recursos horizontalmente

---

## 📊 Métricas y Thresholds

### Métricas Estándar de K6

| Métrica | Descripción | Objetivo |
|---------|-------------|----------|
| `http_req_duration` | Tiempo de respuesta | p95 < 2s |
| `http_req_failed` | Tasa de errores | < 10% |
| `http_reqs` | Requests por segundo | Max throughput |
| `vus` | Usuarios virtuales activos | Según stages |
| `data_received` | Datos descargados | Monitorear bandwidth |
| `data_sent` | Datos enviados | Monitorear bandwidth |

### Métricas Personalizadas

```javascript
// Counter: Incrementa valores
const loginFailures = new Counter("login_failures");
loginFailures.add(1);  // Incrementar en 1

// Trend: Registra valores para análisis estadístico
const pizzaTime = new Trend("pizza_generation_time");
pizzaTime.add(duration);  // Agregar tiempo en ms

// Rate: Calcula porcentajes
const successRate = new Rate("success_rate");
successRate.add(true);   // Éxito
successRate.add(false);  // Fallo
```

### Thresholds Configurados

```javascript
thresholds: {
  // 95% de requests deben responder en < 2s
  "http_req_duration": ["p(95)<2000"],
  
  // 99% de requests deben responder en < 3s
  "http_req_duration": ["p(99)<3000"],
  
  // Menos del 10% de requests pueden fallar
  "http_req_failed": ["rate<0.1"],
  
  // Más del 90% de checks deben pasar
  "success_rate": ["rate>0.9"],
  
  // Threshold por grupo específico
  "http_req_duration{name:UserLogin}": ["p(95)<3000"],
}
```

### Checks vs Thresholds

```javascript
// CHECKS: Validaciones durante la ejecución (no fallan la prueba)
check(response, {
  "status is 200": (r) => r.status === 200,
  "response time < 500ms": (r) => r.timings.duration < 500,
});

// THRESHOLDS: Criterios de éxito/fallo (fallan la prueba)
thresholds: {
  "http_req_duration": ["p(95)<2000"],  // Si falla, prueba = FAIL
}
```

---

## 🚀 Guía de Inicio Rápido

### Checklist de Implementación

- [ ] ✅ Script K6 creado (`my-script.js`)
- [ ] ✅ Workflow de GitHub Actions configurado (`.github/workflows/k6-load-test.yml`)
- [ ] ✅ Cuenta de Grafana Cloud creada
- [ ] ✅ Token de API de Grafana obtenido
- [ ] ✅ Secret `K6_CLOUD_TOKEN` agregado en GitHub
- [ ] ✅ Primera ejecución de prueba realizada
- [ ] ✅ Dashboard de Grafana verificado
- [ ] ✅ Documentación completada

### Comandos Útiles

```bash
# Verificar sintaxis del script
k6 inspect my-script.js

# Ejecutar prueba rápida (1 usuario, 10s)
k6 run --vus 1 --duration 10s my-script.js

# Ejecutar con más verbosidad
k6 run --verbose my-script.js

# Generar reporte JSON
k6 run --out json=results.json my-script.js

# Ejecutar y enviar a Grafana Cloud
k6 cloud my-script.js

# Ver ayuda de K6
k6 help
```

---

## 📚 Referencias

### Documentación Oficial
- [K6 Documentation](https://k6.io/docs/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Grafana Cloud K6](https://grafana.com/docs/grafana-cloud/k6/)

### Recursos Adicionales
- [K6 Examples](https://k6.io/docs/examples/)
- [Best Practices](https://k6.io/docs/misc/best-practices/)
- [HTTP Requests](https://k6.io/docs/using-k6/http-requests/)

### Soporte
- [K6 Community Forum](https://community.k6.io/)
- [GitHub Issues](https://github.com/grafana/k6/issues)

---

## 📸 Capturas de Pantalla Requeridas para el Documento

### Para el PDF de entrega, incluir:

1. **Configuración de GitHub + Grafana**
   - [ ] Pantalla de configuración de API Token en Grafana Cloud
   - [ ] Pantalla de GitHub Secrets con `K6_CLOUD_TOKEN` configurado
   - [ ] Pantalla de Grafana mostrando el proyecto VOBE

2. **Ejecución del Pipeline**
   - [ ] GitHub Actions - Tab "Actions" mostrando workflow ejecutándose
   - [ ] GitHub Actions - Detalles de los pasos del workflow (todos ✅)
   - [ ] GitHub Actions - Artefactos generados (summary.html, results.json)

3. **Visualización en Grafana**
   - [ ] Dashboard principal con métricas de la prueba
   - [ ] Gráfico de HTTP Request Duration
   - [ ] Gráfico de Virtual Users
   - [ ] Panel de Checks con porcentajes
   - [ ] Vista de resultados por grupo/escenario

---

## 👥 Información del Equipo

**Proyecto:** VOBE - Pruebas de Carga Automatizadas  
**Fecha:** Octubre 2025  
**Grafana Cloud:** https://azus34.grafana.net/a/k6-app/runs/5854582  
**Repositorio:** [Link a tu repositorio GitHub]

---

## 📝 Notas Finales

Este pipeline está configurado para ejecutarse automáticamente en cada push al repositorio. Las métricas se envían a Grafana Cloud donde pueden ser analizadas en detalle.

**Recomendaciones:**
- Ejecutar pruebas en horarios de bajo tráfico inicialmente
- Aumentar la carga gradualmente
- Monitorear recursos del servidor durante las pruebas
- Revisar logs de aplicación después de cada ejecución
- Ajustar thresholds según resultados observados

¡Buena suerte con tus pruebas de carga! 🚀
