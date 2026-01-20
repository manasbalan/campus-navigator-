
import { GoogleGenAI, Type, GenerateContentResponse, Modality, FunctionDeclaration } from "@google/genai";
import { NarrationStep, Message, Location } from "../types";

const navigateToLocationFunctionDeclaration: FunctionDeclaration = {
  name: 'navigateToLocation',
  parameters: {
    type: Type.OBJECT,
    description: 'Focus the map on a building or a specific event happening in that building.',
    properties: {
      locationId: {
        type: Type.STRING,
        description: 'The unique ID of the location. Valid IDs: main-block, cafeteria, gym, stadium, main-entrance.',
      },
      eventId: {
        type: Type.STRING,
        description: 'The unique ID of the specific event to highlight (e.g., e1, e2, etc.).',
      }
    },
    required: ['locationId'],
  },
};

const getSystemInstruction = (accessibilityMode: boolean, locations: Location[]) => {
  const campusContext = locations.map(l => ({
    id: l.id,
    name: l.name,
    type: l.type,
    coords: l.coordinates,
    rooms: l.rooms,
    features: l.features,
    events: l.events?.map(e => ({ id: e.id, title: e.title, time: e.time, category: e.category, description: e.description }))
  }));

  return `
You are "Titan-1", the AI Campus Guide.

CAMPUS DATA:
${JSON.stringify(campusContext)}

BEHAVIORAL GUIDELINES:
1. DISTANCES: 1 coordinate unit is approximately 1.25 meters. If asked about distances, calculate the Euclidean distance between building centers.
   - Example calculation: Distance = sqrt((x2-x1)^2 + (y2-y1)^2) * 1.25.
   - Provide the distance in meters and walking time (assume 80 meters per minute).
2. EVENTS: When asked about events, provide Title, Time, and a short detail.
3. NAVIGATION: Always call 'navigateToLocation' when a place is mentioned.
4. CONCISE: Keep responses under 30 words.
5. ${accessibilityMode ? 'ACCESSIBILITY: Describe event venues in spatial detail for navigation. Max 65 words.' : ''}

Always use the 'navigateToLocation' tool for any place-related query.
`;
};

// Shared state for quota tracking
let globalQuotaCooldownUntil = 0;
let ttsSpecificCooldownUntil = 0;

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, initialDelay = 4000): Promise<T> {
  let lastError: any;
  let delay = initialDelay;

  for (let i = 0; i < maxRetries; i++) {
    const now = Date.now();
    if (now < globalQuotaCooldownUntil) {
      throw new Error("QUOTA_COOLDOWN_ACTIVE");
    }

    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errorMessage = err?.message || "";
      const isQuotaError = errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429') || err?.status === 429;

      if (isQuotaError) {
        globalQuotaCooldownUntil = Date.now() + 15000;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 3;
          continue;
        }
      }
      throw err;
    }
  }
  throw lastError;
}

export async function askCampusAssistant(prompt: string, history: Message[], locations: Location[], accessibilityMode: boolean = false) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: getSystemInstruction(accessibilityMode, locations),
        temperature: 0.8,
        tools: [{ functionDeclarations: [navigateToLocationFunctionDeclaration] }],
      },
    })) as GenerateContentResponse;

    return {
      text: response.text || "I've found that for you.",
      functionCalls: response.functionCalls
    };
  } catch (error: any) {
    if (error?.message === "QUOTA_COOLDOWN_ACTIVE" || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      return { text: "Too many requests. Please wait a moment!" };
    }
    return { text: "My campus database is offline temporarily. Please try again." };
  }
}

export async function generateAudioForText(fullText: string): Promise<NarrationStep[]> {
    const now = Date.now();
    if (now < ttsSpecificCooldownUntil) return [];

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const text = fullText.trim();
    if (!text) return [];

    try {
      const ttsResponse = await withRetry(() => ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: { parts: [{ text: text }] },
          config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                  voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                  },
              },
          },
      }), 1, 5000) as GenerateContentResponse;

      const audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audio) return [{ text, audioBase64: audio }];
    } catch (e: any) {
      if (e?.message?.includes('429') || e?.message?.includes('RESOURCE_EXHAUSTED')) {
        ttsSpecificCooldownUntil = Date.now() + 60000;
      }
    }
    return [];
}

export async function narrateEvent(eventName: string, buildingName: string, buildingDescription: string, accessibilityMode: boolean = false): Promise<NarrationStep[]> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const textPrompt = `Describe event "${eventName}" at ${buildingName}. ${accessibilityMode ? 'Describe path for accessibility.' : 'Short detail.'}`;

    const textGenResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: textPrompt,
      config: {
        systemInstruction: accessibilityMode ? "Max 40 words." : "Max 15 words.",
        temperature: 0.5,
      }
    })) as GenerateContentResponse;

    const text = textGenResponse.text;
    if (!text) return [];
    
    const audioSteps = await generateAudioForText(text);
    return audioSteps.length > 0 ? audioSteps : [{ text, audioBase64: '' }];
  } catch (error) {
    return [];
  }
}

export async function narrateBuilding(buildingName: string, description: string, accessibilityMode: boolean = false): Promise<NarrationStep[]> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const textPrompt = `Summarize ${buildingName}. ${accessibilityMode ? 'Detail layout for visual navigation.' : 'Briefly.'}`;

    const textGenResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: textPrompt,
      config: {
        systemInstruction: accessibilityMode ? "Max 50 words." : "Max 15 words.",
        temperature: 0.4,
      }
    })) as GenerateContentResponse;

    const text = textGenResponse.text;
    if (!text) return [];
    
    const audioSteps = await generateAudioForText(text);
    return audioSteps.length > 0 ? audioSteps : [{ text, audioBase64: '' }];
  } catch (error) {
    return [];
  }
}

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
