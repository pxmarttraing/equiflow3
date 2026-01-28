
import { GoogleGenAI, Type } from "@google/genai";
import { EquipmentItem } from "../types";

// Always use process.env.API_KEY directly for initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSmartRecommendations = async (taskDescription: string, inventory: EquipmentItem[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on the following user task: "${taskDescription}", suggest the most appropriate equipment from this inventory: ${JSON.stringify(inventory.map(i => ({ id: i.id, name: i.name })))}. Return only the IDs of suggested items as a JSON array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text) as string[];
    }
    return [];
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};
