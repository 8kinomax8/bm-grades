import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import "dotenv/config";
import { testConnection } from "./db.js";
import routes from "./routes.js";
import { BACKEND_CONFIG, validateConfig } from "../config.js";

validateConfig();

const app = express();
app.use(cors({
  origin: BACKEND_CONFIG.CORS_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: BACKEND_CONFIG.MAX_FILE_SIZE }));

// API routes
app.use('/api', routes);

// 🔒 FIXED PROMPTS
const BULLETIN_PROMPT = `
Analyze this Swiss Berufsmaturität school report. Extract ONLY subjects and their grades. Respond ONLY with valid JSON, no preamble, no markdown, in this exact format:
{
  "semester": semester_number,
  "grades": {
    "Subject_Name": numeric_grade,
    "Other_Subject": numeric_grade
  }
}

Possible subjects: Deutsch, Englisch, Französisch, Mathematik, Naturwissenschaften, Finanz- und Rechnungswesen, Wirtschaft und Recht, Geschichte und Politik, Interdisziplinäres Arbeiten in den Fächern.

If you don't find information, return {"error": "description"}.
`;

const SAL_PROMPT = `
Analyze this SAL screenshot (list of assessments). Extract ALL assessments with their subject, date and grade. Respond ONLY with valid JSON, no preamble, no markdown, in this exact format:
{
  "semester": "current",
  "controls": [
    {
      "subject": "Canonical_Subject_Name",
      "date": "YYYY-MM-DD",
      "name": "Assessment name",
      "grade": numeric_grade
    }
  ]
}

IMPORTANT RULES:
- IGNORE all lines where the subject name starts with a number (e.g.: "129-INP", "202-MAT")
- Deduce the subject from the assessment name and/or the start of the subject name
- Extract the date of each assessment (format YYYY-MM-DD if possible, otherwise DD.MM.YYYY)
- Use ONLY these canonical subject names: Deutsch, Englisch, Französisch, Mathematik, Naturwissenschaften, Finanz- und Rechnungswesen, Wirtschaft und Recht, Geschichte und Politik, Interdisziplinäres Arbeiten in den Fächern

MAPPINGS (use the canonical name directly):
- DEU/Deutsch → Deutsch
- ENG/Englisch → Englisch
- FRA/Französisch → Französisch
- MS/MG/Mathematik → Mathematik
- NWCH/NWPH → Naturwissenschaften
- FRW/Finanz → Finanz- und Rechnungswesen
- WR/Wirtschaft → Wirtschaft und Recht
- GE/Geschichte → Geschichte und Politik
- IDAF/Interdisziplinär → Interdisziplinäres Arbeiten in den Fächern

If you don't find information, return {"error": "description"}.
`;

app.post("/api/scan", async (req, res) => {
  console.log("🔵 Request received on /api/scan");
  try {
    const { image, scanType } = req.body;

    if (!image) {
      console.log("❌ No image provided");
      return res.status(400).json({ error: "No image provided" });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("❌ Missing API key");
      return res.status(500).json({ error: "Missing Anthropic API key" });
    }

    // Select prompt based on scan type
    const prompt = scanType === 'SAL' ? SAL_PROMPT : BULLETIN_PROMPT;
    console.log(`📸 Analyzing image (type: ${scanType || 'Bulletin'})...`);
    console.log("🔑 API Key:", process.env.ANTHROPIC_API_KEY.substring(0, 15) + "...");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: image.split(';')[0].split(':')[1],
                  data: image.split(',')[1]
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Anthropic API error:", response.status, errorText);
      return res.status(response.status).json({ error: `API error: ${response.status}` });
    }

    const data = await response.json();
    console.log("✅ Response received:", JSON.stringify(data, null, 2));
    res.json(data);

  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

app.listen(BACKEND_CONFIG.PORT, BACKEND_CONFIG.HOST, async () => {
  console.log(`Backend API running on http://${BACKEND_CONFIG.HOST}:${BACKEND_CONFIG.PORT}`);
  console.log("Environment:", BACKEND_CONFIG.NODE_ENV);
  console.log("Loaded API key:", BACKEND_CONFIG.ANTHROPIC_API_KEY ? `✅ (starts with ${BACKEND_CONFIG.ANTHROPIC_API_KEY.substring(0, 10)}...)` : "❌ MISSING");
  console.log("CORS origins:", BACKEND_CONFIG.CORS_ORIGINS);
  
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error("⚠️ Running without database.");
  }
});