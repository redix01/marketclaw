import { GoogleGenAI, Type } from "@google/genai";
import { Agent, SymbolInfo, Position } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const geminiService = {
  async getAgentDecision(agent: Agent, symbols: SymbolInfo[], positions: Position[]) {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          text: `You are a trading agent named "${agent.name}" using the "${agent.template}" strategy.
          
          Current Portfolio:
          ${positions.map(p => `- ${p.symbol}: ${p.quantity} shares (Avg Cost: ${p.averageEntryPrice})`).join('\n')}
          
          Market Data:
          ${symbols.map(s => `- ${s.symbol}: Current Price ${s.price}, Day Change ${s.changePercent}%`).join('\n')}
          
          Your Strategy Template: ${agent.template}
          Your Symbols Universe: ${agent.symbols.join(', ')}
          Max Allocation: ${agent.maxAllocation}%
          Max Position Size: ${agent.maxPositionSize}
          
          Decide whether to BUY, SELL, or HOLD for each symbol in your universe.
          Provide a reasoning for each decision.
          `
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decisions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  symbol: { type: Type.STRING },
                  action: { type: Type.STRING, enum: ["BUY", "SELL", "HOLD"] },
                  quantity: { type: Type.NUMBER },
                  reasoning: { type: Type.STRING }
                },
                required: ["symbol", "action", "reasoning"]
              }
            }
          },
          required: ["decisions"]
        }
      }
    });

    const response = await model;
    return JSON.parse(response.text);
  }
};
