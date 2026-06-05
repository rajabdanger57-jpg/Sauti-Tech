import { createRequire } from "module";
import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const requireCustom = createRequire(import.meta.url);

// Robustly shim all global variables used by lamejs in Node.js
try {
  const fs = requireCustom("fs");
  const pathLib = requireCustom("path");
  const lamejsDir = pathLib.dirname(requireCustom.resolve("lamejs"));
  
  // 1. Shim common.js functions (e.g., system, new_byte, etc.)
  const common = requireCustom(pathLib.join(lamejsDir, "common.js"));
  for (const key of Object.keys(common)) {
    if (!(key in global)) {
      Object.defineProperty(global, key, {
        get: () => common[key],
        configurable: true,
        enumerable: true
      });
    }
    if (!(key in globalThis)) {
      Object.defineProperty(globalThis, key, {
        get: () => common[key],
        configurable: true,
        enumerable: true
      });
    }
  }

  // 2. Define lazy-getters for every js module name in lamejs/src/js
  const files = fs.readdirSync(lamejsDir);
  for (const file of files) {
    if (file.endsWith(".js") && file !== "index.js") {
      const moduleName = file.substring(0, file.length - 3);
      let cachedModule: any = null;
      const getter = () => {
        if (!cachedModule) {
          cachedModule = requireCustom(pathLib.join(lamejsDir, file));
        }
        return cachedModule;
      };
      
      if (!(moduleName in global)) {
        Object.defineProperty(global, moduleName, {
          get: getter,
          configurable: true,
          enumerable: true
        });
      }
      if (!(moduleName in globalThis)) {
        Object.defineProperty(globalThis, moduleName, {
          get: getter,
          configurable: true,
          enumerable: true
        });
      }
    }
  }
} catch (e) {
  console.error("Failed to apply lamejs global shims:", e);
}

const lamejs = requireCustom("lamejs");

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini AI client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

/**
 * Encodes 16-bit linear PCM audio to MP3 using lamejs.
 * @param pcmBase64 Base64 encoded pcm audio bytes
 * @returns Buffer containing MP3 audio bytes
 */
function convertPcmToMp3(pcmBase64: string): Buffer {
  const rawBuffer = Buffer.from(pcmBase64, "base64");
  
  // Safely read 16-bit signed integers (PCM 16-bit mono)
  const samplesCount = Math.floor(rawBuffer.length / 2);
  const samples = new Int16Array(samplesCount);
  for (let i = 0; i < samplesCount; i++) {
    samples[i] = rawBuffer.readInt16LE(i * 2);
  }

  // Gemini TTS uses 24000Hz, Mono channel
  const channels = 1;
  const sampleRate = 24000;
  const bitrate = 128; // 128kbps is excellent quality for voice

  const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitrate);
  const mp3Chunks: Buffer[] = [];

  // Encode PCM samples
  const encChunks = mp3encoder.encodeBuffer(samples);
  if (encChunks.length > 0) {
    mp3Chunks.push(Buffer.from(encChunks));
  }

  // Flush encoder
  const flushChunks = mp3encoder.flush();
  if (flushChunks.length > 0) {
    mp3Chunks.push(Buffer.from(flushChunks));
  }

  return Buffer.concat(mp3Chunks);
}

// API endpoint to convert Text to Speech and return MP3 base64 or file
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice = "Kore" } = req.body;

    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ error: "Tafadhali weka maandishi yasiyopungua neno moja." });
    }

    const ai = getGeminiClient();

    // Use Gemini Text-to-Speech preview model
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("Mtafsiri wa Gemini hakutoa toleo la sauti. Tafadhali jaribu tena.");
    }

    // Convert raw PCM 24000Hz mono audio to MP3
    const mp3Buffer = convertPcmToMp3(base64Audio);
    const mp3Base64 = mp3Buffer.toString("base64");

    res.json({
      success: true,
      audioBase64: mp3Base64,
      mimeType: "audio/mp3",
      voice,
      text,
    });
  } catch (error: any) {
    console.error("Error during TTS generation:", error);
    res.status(500).json({
      error: error.message || "Toleo la sauti liliambulia kufeli. Tafadhali thibitisha ufunguo wa GEMINI_API_KEY.",
    });
  }
});

// Direct GET endpoint for downloadable MP3 file
app.get("/api/tts/download", async (req, res) => {
  try {
    const text = req.query.text as string;
    const voice = (req.query.voice as string) || "Kore";

    if (!text || text.trim() === "") {
      return res.status(400).send("Weka parameter ?text=...");
    }

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).send("Hakuna sauti liliyozalishwa na Gemini.");
    }

    const mp3Buffer = convertPcmToMp3(base64Audio);

    // Sanitize text for filename
    const cleanFilename = text
      .slice(0, 20)
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "sauti";

    res.setHeader("Content-Disposition", `attachment; filename="${cleanFilename}.mp3"`);
    res.setHeader("Content-Type", "audio/mp3");
    res.send(mp3Buffer);
  } catch (error: any) {
    console.error("Error downloading file:", error);
    res.status(500).send(`Hitilafu imetokea: ${error.message}`);
  }
});

// Configure Vite middleware or static serving
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Development Server running on port ${PORT}`);
  });
}

setupVite();
