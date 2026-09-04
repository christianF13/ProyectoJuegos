import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { gameManager } from '../core/engine/GameManager';
import { gameRegistry } from '../core/registry/GameRegistry';
import { GameState } from '../core/types/game.types';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ConversationTurn {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

class GameMasterAI {
  private history: ConversationTurn[] = [];
  private currentGameId: string | null = null;

  private buildSystemInstruction(gameState: GameState | null): string {
    const availableGames = gameRegistry
      .getAllGames()
      .map(g => `- ${g.name} (id: ${g.id}): ${g.description} [${g.minPlayers}-${g.maxPlayers} jugadores]`)
      .join('\n');

    let gameContext = '';
    if (gameState) {
      const definition = gameRegistry.getGame(gameState.gameDefinitionId);
      const alive = gameState.players.filter(p => p.isAlive);
      const wolves = alive.filter(p => p.faction === 'wolves').length;
      const villagers = alive.filter(p => p.faction === 'village').length;
      gameContext = `
## ESTADO DE LA PARTIDA EN CURSO
- Juego: ${definition?.name}
- Estado: ${gameState.status === 'lobby' ? 'En sala de espera' : gameState.status === 'active' ? 'En curso' : 'Terminada'}
- Fase actual: ${gameState.phase}
- Ronda: ${gameState.round}
- Código de sala: ${gameState.code}
- Jugadores totales: ${gameState.players.length}
- Jugadores vivos: ${alive.length}
- Lista de jugadores: ${gameState.players.map(p => `${p.name} (${p.isAlive ? 'vivo' : 'eliminado'})`).join(', ')}
`;
    }

    return `Eres Game Master AI, el maestro de ceremonias de inteligencia artificial de una plataforma de juegos de mesa llamada "Game Master AI".

## TU PERSONALIDAD
- Eres dramático, carismático y misterioso, pero también amigable y accesible
- Hablas siempre en español, con un tono narrativo y cinematográfico
- Mantienes el suspenso y la emoción durante toda la partida
- Eres completamente imparcial: nunca favoreces a ningún bando
- Tu voz es la de un narrador que hace la historia más interesante

## JUEGOS DISPONIBLES
${availableGames}
${gameContext}
## TUS RESPONSABILIDADES
1. Dar bienvenida a los jugadores y crear atmósfera
2. Preguntar cuántas personas jugarán y sus nombres
3. Preguntar si hay niños para adaptar el lenguaje (si hay niños, evitar términos oscuros)
4. Preguntar qué juego quieren jugar
5. Explicar las reglas de manera emocionante y clara
6. Narrar el inicio y las fases de la partida
7. Anunciar eventos importantes (eliminaciones, resultados de votación, fin del juego)
8. Responder preguntas sobre las reglas del juego actual
9. Narrar los anuncios oficiales del sistema incorporándolos a tu relato
10. Indicar a los jugadores QUÉ DEBEN HACER (ej. "Revisen sus celulares", "Elijan a su presa")
11. SIEMPRE indicar el tiempo límite disponible si se inicia una fase (ej. "Tenéis 1 minuto y medio").
12. Mantener la atmósfera y el drama durante toda la partida

## REGLAS ABSOLUTAS
- Escribe SOLO las palabras exactas que se dirán en voz alta.
- NUNCA uses formato Markdown (asteriscos, negritas, cursivas).
- NUNCA escribas acotaciones de actuación o narrativas como "(con voz grave)", "(susurra)", "(pausa dramática)".
- NUNCA reveles el rol de un jugador a otro jugador
- NUNCA inventes mecánicas de juego que no existan en las reglas
- NUNCA tomes decisiones que corresponden al motor del juego (roles, victoria, eliminación)
- Si no sabes algo de las reglas, di "Consulta las reglas del juego"
- Respuestas CONCISAS (máximo 3-4 oraciones) a menos que estés explicando reglas completas
- Cuando narres eventos del juego, sé dramático pero breve

## CUANDO EL SISTEMA TE ENVÍE EVENTOS JSON
El sistema puede enviarte mensajes en formato JSON con información sobre eventos del juego.
Responde narrando ese evento de manera dramática y apropiada para la audiencia.
Ejemplos:
- {"type": "phase_started", "phase": "night"} → narra el inicio de la noche
- {"type": "player_eliminated", "name": "X", "role": "werewolf"} → anuncia la eliminación dramáticamente
- {"type": "game_ended", "faction": "wolves"} → celebra a los ganadores`;
  }

  async chat(userMessage: string, gameId?: string): Promise<string> {
    if (gameId) this.currentGameId = gameId;

    let gameState: GameState | null = null;
    if (this.currentGameId) {
      try { gameState = gameManager.getState(this.currentGameId); } catch { /* no game */ }
    }

    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.5-flash',
        systemInstruction: this.buildSystemInstruction(gameState),
      });

      const chat = model.startChat({ history: this.history });
      
      let response = '';
      let retries = 3;
      while (retries > 0) {
        try {
          const result = await chat.sendMessage(userMessage);
          response = result.response.text();
          break; // Exito
        } catch (error: any) {
          if (error.status === 429 || error.message.includes('429')) {
            console.warn(`[API] Límite alcanzado. Reintentando en 3 segundos... (${retries} intentos restantes)`);
            await new Promise(res => setTimeout(res, 3000));
            retries--;
            if (retries === 0) throw error;
          } else {
            throw error;
          }
        }
      }

      this.history.push(
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: response }] }
      );

      // Keep last 30 turns
      if (this.history.length > 30) {
        this.history = this.history.slice(-30);
      }

      return response;
    } catch (err: any) {
      console.error('Gemini API error:', err.message);
      return 'El servidor de IA está un poco saturado en este momento. Dame unos segundos y vuelve a intentarlo.';
    }
  }

  async narrateEvent(eventData: Record<string, unknown>, gameId?: string): Promise<string> {
    const jsonMsg = JSON.stringify(eventData);
    return this.chat(jsonMsg, gameId);
  }

  reset(): void {
    this.history = [];
    this.currentGameId = null;
  }
}

export const gameMasterAI = new GameMasterAI();
