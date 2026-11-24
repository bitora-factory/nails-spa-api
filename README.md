# Nails Spa API — Taller final de Arquitectura de Software

API REST por capas (Node.js + Express) para gestionar los turnos (citas) de **Nails Spa**.

## Integrantes

Ordenados alfabéticamente por apellido, según el listado oficial de asistencia
(Arquitectura de software – Grupo 1, martes).

| # de lista | Nombre completo |
|-----------:|-----------------|
| 11 | Kevin Mauricio Mejía Almansa |
| 16 | Luna Rave Acosta |
| 17 | Winder Alexander Román Semprún |

## Regla de negocio parametrizada (N)

- **N = 11** — al ordenar por apellido (Mejía Almansa, Rave Acosta, Román Semprún), el primer
  integrante es Kevin Mauricio Mejía Almansa, que ocupa el puesto #11 de la lista oficial.
- **Porcentaje de recargo** = N × 2 % = 11 × 2 % = **22 %**.
- Se aplica en la capa de servicios ([`services/tarifa.service.js`](services/tarifa.service.js)):
  - `"prioritario": true` → `totalPagar = precioBase + precioBase × (22 / 100)`
  - `"prioritario": false` o sin especificar → `totalPagar = precioBase`

| precioBase | prioritario | recargo (22 %) | totalPagar |
|-----------:|:-----------:|---------------:|-----------:|
| 60 000 | true  | 13 200 | **73 200** |
| 60 000 | false | 0 | **60 000** |
| 25 000 | true  | 5 500 | **30 500** |

En Nails Spa, un turno **prioritario** es una cita que el cliente pide con atención preferente
(por ejemplo, el mismo día o para un evento); por eso se cobra con el recargo.

## El negocio: Nails Spa

Nails Spa es un salón especializado exclusivamente en el cuidado y la estética de las uñas:
manicura, pedicura, esmaltado tradicional y semipermanente, uñas acrílicas, uñas en gel y
diseños personalizados. Hoy las citas se gestionan por WhatsApp y llamadas, lo que produce
confusiones y cruces de horario en las agendas de las manicuristas. Esta API centraliza el
registro de turnos y **evita que una manicurista tenga dos citas superpuestas**, que es la
regla de negocio más importante identificada en el levantamiento de requisitos.

### Datos de un turno

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `cliente` | texto | sí | Nombre del cliente |
| `telefono` | texto | sí | Contacto del cliente (para la confirmación) |
| `servicio` | texto | sí | Código del servicio del catálogo (ver `GET /api/servicios`) |
| `manicurista` | texto | sí | Manicurista que atenderá |
| `fecha` | texto `AAAA-MM-DD` | sí | Fecha de la cita |
| `hora` | texto `HH:mm` | sí | Hora de inicio (24 h) |
| `precioBase` | número > 0 | sí | Precio del servicio en pesos |
| `prioritario` | booleano | no | Si es `true` se aplica el recargo del 22 % |

El servidor calcula además `horaFin` (inicio + duración del servicio), `porcentajeRecargo`,
`recargo`, `totalPagar` y `estado` (`activa` o `cancelada`).

### Catálogo de servicios

| Código | Servicio | Duración |
|--------|----------|---------:|
| `manicura` | Manicura | 45 min |
| `pedicura` | Pedicura | 60 min |
| `esmaltado-tradicional` | Esmaltado tradicional | 30 min |
| `esmaltado-semipermanente` | Esmaltado semipermanente | 60 min |
| `unas-acrilicas` | Uñas acrílicas | 120 min |
| `unas-gel` | Uñas en gel | 90 min |
| `diseno-personalizado` | Diseño personalizado | 75 min |

## Arquitectura por capas

```
nails-spa-api/
├── index.js                     # Inicializa Express, express.json(), conecta rutas y levanta el servidor
├── routes/
│   ├── turnos.routes.js         # Solo endpoints -> controlador
│   └── servicios.routes.js
├── controllers/
│   ├── turnos.controller.js     # req/res, validación de entrada, códigos HTTP
│   └── servicios.controller.js
├── services/
│   ├── turnos.service.js        # Reglas de negocio (anti-cruce, cancelación) y gestión de datos
│   ├── tarifa.service.js        # Parámetro N y cálculo de totalPagar
│   └── catalogo.service.js      # Servicios del salón y su duración
├── data/turnos.json             # Almacenamiento local en archivo .json
└── test/api.test.js             # Pruebas de los endpoints
```

Flujo de un `POST /api/turnos`:
**routes** recibe la petición → **controller** valida el cuerpo (si falla responde 400) →
**service** verifica el servicio, calcula la hora de fin, comprueba que la manicurista no tenga
otra cita que se cruce, calcula la tarifa con N y guarda → **controller** responde 201 con el
turno creado.

Relación con el documento de decisiones arquitectónicas de Nails Spa: la API corresponde a
la decisión DA-03 (API REST sobre HTTPS/JSON, síncrona) y aplica la regla anti-cruce de DA-04
(`inicioNuevo < finExistente Y finNuevo > inicioExistente`, ignorando citas canceladas).
Cancelar cambia el estado a `cancelada` en lugar de borrar, para conservar el historial y
liberar el horario. Por requisito del taller se usa un archivo `.json` local en lugar de MySQL.

## Endpoints

| Método | Ruta | Respuesta |
|--------|------|-----------|
| GET | `/api/turnos` | 200 — lista de turnos. Filtros opcionales: `?manicurista=Paola&fecha=2026-12-05&estado=activa` (agenda de una manicurista) |
| GET | `/api/turnos/:id` | 200 — el turno; **404** si no existe |
| POST | `/api/turnos` | **201** — turno creado; **400** datos inválidos; **409** horario ocupado |
| PATCH | `/api/turnos/:id/cancelar` | 200 — turno cancelado; **404** si no existe; 400 si ya estaba cancelado |
| GET | `/api/servicios` | 200 — catálogo de servicios |

Cualquier ruta inexistente responde 404 y un JSON mal formado responde 400; el servidor
nunca se detiene por una petición errónea.

## Instalación y ejecución

Requiere Node.js 18 o superior.

```bash
npm install
npm start          # http://localhost:3000
npm test           # ejecuta las pruebas de los endpoints
```

## Ejemplos para probar `POST /api/turnos`

### Caso exitoso — 201 Created

```bash
curl -X POST http://localhost:3000/api/turnos \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": "Laura Gómez",
    "telefono": "3001234567",
    "servicio": "unas-gel",
    "manicurista": "Paola",
    "fecha": "2026-12-05",
    "hora": "10:00",
    "precioBase": 60000,
    "prioritario": true
  }'
```

Resultado obtenido (**201 Created**):

```json
{
  "id": 1,
  "cliente": "Laura Gómez",
  "telefono": "3001234567",
  "servicio": "unas-gel",
  "nombreServicio": "Uñas en gel",
  "manicurista": "Paola",
  "fecha": "2026-12-05",
  "horaInicio": "10:00",
  "horaFin": "11:30",
  "duracionMinutos": 90,
  "prioritario": true,
  "precioBase": 60000,
  "porcentajeRecargo": 22,
  "recargo": 13200,
  "totalPagar": 73200,
  "estado": "activa",
  "creadoEn": "2026-11-24T14:26:13.107Z"
}
```

`totalPagar = 60 000 + 60 000 × 22 / 100 = 73 200`.

### Error de validación — 400 Bad Request

Faltan `telefono` y `manicurista`, y `precioBase` es 0:

```json
{
  "cliente": "Ana Ruiz",
  "servicio": "manicura",
  "fecha": "2026-12-05",
  "hora": "14:00",
  "precioBase": 0
}
```

Resultado obtenido (**400 Bad Request**):

```json
{
  "error": "Datos inválidos.",
  "detalles": [
    "Faltan campos obligatorios: telefono, manicurista.",
    "El campo \"precioBase\" debe ser mayor que cero."
  ]
}
```

### Otros resultados

- Horario ocupado (misma manicurista, 11:00 ese mismo día) → **409 Conflict**:
  `{"error": "La manicurista Paola ya tiene una cita de 10:00 a 11:30 el 2026-12-05. Elija otro horario u otra manicurista."}`
- `GET /api/turnos/99` → **404 Not Found**: `{"error": "No existe un turno con id 99."}`
