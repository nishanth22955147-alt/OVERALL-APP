import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Master Item Lists for reference in prompt
const SECTION_1_ITEMS = [
  "BRINJAL", "RAW MANGO", "GREEN BRINJAL", "CAULIFLOWER", "GREEN CHILLI", "ROUND CHILLI",
  "BELT AVARAI", "TOMATO", "RADISH", "RAW BANANA", "KV BANANA", "NEE BANANA",
  "POOVAM BANANA", "RED BANANA", "ELAKI BANANA", "BITTER GOURD", "MINT", "CORIANDER",
  "METHI", "PALAK", "MP MIX", "RED GOVA", "BANANA LEAVES", "RED ROSE", "KUMKI",
  "MIXING FLOWER", "YELLOW FLOWER", "ORANGE FLOWER", "ORANGE ROSE", "YELLOW ROSE",
  "PINK ROSE", "WHITE KUMKI", "MM FLOWER", "MALLI", "MULLAI", "MALLI MALAI 1.5 FEET"
];

const SECTION_2_ITEMS = [
  "LEMON", "KOVAIKAI", "AMLA", "ANNAR", "SEPPAI", "SENNAI", "PIDI KARANAI",
  "GARLIC", "GINGER", "GAWAR", "SNAKE GOURD", "DOODHI", "BAJII CHILLI",
  "GROUND NUT", "BABY POTATO", "GREEN PEAS", "BEANS", "LADIES FINGER",
  "DRUMSTICK", "PERANADAI", "PANA KIZHANGU", "SWEET LEMON", "CUSTARD APPLE",
  "SAPPOTA", "NEELAM", "MALLI MALAI 1 FEET", "ROSE MALAI 1.5 FEET",
  "VELAMPALAM", "KELAKAI", "ARUGAM PULL LOSE", "ARUGAM PULL MALAI",
  "VETRIALL", "BETAL LEAVES", "PERIKAI"
];

const ALL_MASTER_ITEMS = [...SECTION_1_ITEMS, ...SECTION_2_ITEMS];

// API Endpoints
app.post('/api/parse-whatsapp', async (req, res) => {
  try {
    const { dhineshText, balaText, gopiText, orderDate } = req.body;

    const prompt = `
You are an expert order parser for M/s Priyaam Traders (exporter of wholesale vegetables, fruits, and flowers).
Parse the following raw WhatsApp order messages from three buyers:
1. Dhinesh (+65 9812 3585)
2. Bala (+91 80566 72224)
3. Gopi (+65 8213 0750 / +65 8372 7412)

Order Date provided: ${orderDate || new Date().toISOString().split('T')[0]}
Calculate Packing Date (Order Date + 1 day) and Sales Date (Order Date + 2 days).

Rules:
- Match item names strictly to our Master Item Catalog where possible.
- Normalize spellings (e.g., BRIJNJAL -> BRINJAL, BITTERGOURD -> BITTER GOURD, SNAKEGOURD -> SNAKE GOURD, PIDIKARUNAI -> PIDI KARANAI, SENAI -> SENNAI, POTATO -> BABY POTATO, BAJJI CHILLI -> BAJII CHILLI, LADIESFINGER -> LADIES FINGER, DRUMSTICKS -> DRUMSTICK, FLOWER/FLOWERS -> MIXING FLOWER).
- Sum size breakdowns (e.g. S2 M5 -> 7 boxes/qty, S3 M7 B4 -> 14, m 14 -> 14).
- Treat "000" or "00" as 0 in totals while preserving display notes.
- Keep piece counts (e.g., 400ps -> 400) for items like Banana Leaves or flowers if applicable, but store numeric quantity and weight if specified.

Master Catalog Items:
${JSON.stringify(ALL_MASTER_ITEMS)}

Input Messages:
--- DHINESH ---
${dhineshText || 'No text'}

--- BALA ---
${balaText || 'No text'}

--- GOPI ---
${gopiText || 'No text'}

Return JSON in this exact structure:
{
  "orderDate": "YYYY-MM-DD",
  "packingDate": "YYYY-MM-DD",
  "salesDate": "YYYY-MM-DD",
  "buyers": {
    "dhinesh": { "items": { "ITEM_NAME": { "qty": 0, "kgs": 0, "note": "" } } },
    "bala": { "items": { "ITEM_NAME": { "qty": 0, "kgs": 0, "note": "" } } },
    "gopi": { "items": { "ITEM_NAME": { "qty": 0, "kgs": 0, "note": "" } } }
  }
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: any) {
    console.error('WhatsApp parse error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse WhatsApp orders' });
  }
});

app.post('/api/parse-packing-slips', async (req, res) => {
  try {
    const { images } = req.body; // Array of { base64, mimeType, stationHint }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const imageParts = images.map((img: any) => ({
      inlineData: {
        mimeType: img.mimeType || 'image/jpeg',
        data: img.base64
      }
    }));

    const prompt = `
You are an expert OCR & Document Parser for airport cargo packing slips at M/s Priyaam Traders.
Examine the attached packing slip image(s) (stations include: MAA Normal Green, MAA Normal Blue, MAA Yellow Tape, TCY Normal, BANG Normal, COCHIN Normal).
Extract:
- stationName (e.g., MAA Normal Green, TCY Normal, BANG Normal, etc.)
- tapeType (e.g., Green, Blue, Yellow, Normal)
- slipDate (YYYY-MM-DD)
- driverName
- driverPhone
- grossWeight (number)
- tareWeight (number)
- netWeight (number)
- totalBoxes (number)
- items: Array of { itemName, boxCount, weightKgs }

Normalize item names strictly to our Master Catalog:
${JSON.stringify(ALL_MASTER_ITEMS)}

Return a JSON array of parsed slips:
[
  {
    "stationName": "MAA Normal Green",
    "tapeType": "Green",
    "slipDate": "2026-11-13",
    "driverName": "Ramesh",
    "driverPhone": "+91 98401 23456",
    "grossWeight": 450.5,
    "tareWeight": 50.5,
    "netWeight": 400.0,
    "totalBoxes": 35,
    "items": [
      { "itemName": "BRINJAL", "boxCount": 10, "weightKgs": 120.0 }
    ]
  }
]
`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: [...imageParts, { text: prompt }],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const result = JSON.parse(response.text || '[]');
    res.json(result);
  } catch (error: any) {
    console.error('Packing slip parse error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse packing slips' });
  }
});

app.post('/api/ai-assistant', async (req, res) => {
  try {
    const { promptText, currentState } = req.body;

    const prompt = `
You are an AI Smart Reconciliation Assistant for M/s Priyaam Traders.
The user wants to make a change or query their dispatch consolidation sheet in plain English.
User request: "${promptText}"

Current state summary:
- Order Date: ${currentState?.orderDate}
- Total Slips: ${currentState?.slips?.length || 0}

Master Catalog Items:
${JSON.stringify(ALL_MASTER_ITEMS)}

Perform the requested modification or provide guidance.
Return JSON in this structure:
{
  "action": "UPDATE_ITEM" | "ADD_SLIP" | "DELETE_SLIP" | "GENERAL_ADVICE",
  "message": "Friendly confirmation message",
  "updates": {
    // If modifying items or slips, specify structured changes
    "itemModifications": [
      { "itemName": "BANANA LEAVES", "buyer": "dhinesh", "field": "qty", "value": 12 },
      { "itemName": "BANANA LEAVES", "buyer": "dhinesh", "field": "kgs", "value": 48 }
    ]
  }
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: any) {
    console.error('AI Assistant error:', error);
    res.status(500).json({ error: error.message || 'AI Assistant failed' });
  }
});

// Setup Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
