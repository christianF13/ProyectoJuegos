# Game Master AI 🎮

Plataforma modular de juegos de mesa asistidos por IA.

## Inicio Rápido

### 1. Servidor (Terminal 1)
```bash
cd server
npm run dev
```

### 2. Cliente (Terminal 2)
```bash
cd client
npm run dev
```

### 3. Abrir en el navegador
- **Pantalla Game Master:** http://localhost:3000/game-master
- **Jugadores (desde celular):** http://[TU-IP-LOCAL]:3000/player

---

## Flujo de una Partida

1. Abre `http://localhost:3000/game-master` en el ordenador central
2. Presiona el micrófono y di: *"Hola, queremos jugar"*
3. El Game Master te guiará por voz
4. Crea una partida de Hombre Lobo → aparece un código de sala
5. Los jugadores abren `http://[IP]:3000/player` en sus celulares
6. Cada jugador escribe el código y su nombre
7. Presiona **Iniciar Partida** cuando todos estén listos
8. ¡La IA narra la partida automáticamente!

---

## Arquitectura

```
ProyectoJuegos/
├── server/              # Backend Node.js + TypeScript
│   └── src/
│       ├── core/        # Motor genérico (game-agnostic)
│       │   ├── engine/  # GameManager, EventBus, TimerService...
│       │   ├── types/   # Interfaces genéricas
│       │   ├── privacy/ # PrivacyGuard (crítico para seguridad)
│       │   └── registry/# GameRegistry (carga módulos dinámicamente)
│       ├── games/       # Módulos de juegos
│       │   └── werewolf/# Primer juego: Hombre Lobo
│       ├── ai/          # Capa de IA (Gemini)
│       ├── db/          # SQLite + Drizzle ORM
│       ├── websocket/   # Socket.IO
│       └── api/         # REST API
└── client/              # Frontend Next.js + React + Tailwind
    └── src/
        ├── app/
        │   ├── game-master/ # Pantalla central (oscura/cinematográfica)
        │   └── player/      # Interfaz celular (simple/grande)
        ├── components/
        ├── hooks/           # useSocket, useVoice
        └── lib/             # Socket.IO client
```

## Agregar un Nuevo Juego

1. Crear carpeta `server/src/games/mi-juego/`
2. Crear `index.ts` que exporte una `GameDefinition`
3. El `GameRegistry` lo carga automáticamente
4. **No modificar ningún archivo del núcleo**

## Variables de Entorno

### server/.env
```
PORT=3001
GEMINI_API_KEY=tu-api-key
DB_PATH=./gamemaster.db
CLIENT_URL=http://localhost:3000
```

### client/.env.local
```
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
```
