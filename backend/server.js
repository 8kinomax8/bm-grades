import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import "dotenv/config";

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));

// 🔒 PROMPTS FIXES
const BULLETIN_PROMPT = `
Analyse ce bulletin scolaire suisse de Berufsmaturität. Extrait UNIQUEMENT les matières et leurs notes. Réponds UNIQUEMENT avec un JSON valide, sans préambule, sans markdown, dans ce format exact:
{
  "semester": numéro_du_semestre,
  "grades": {
    "Nom_Matière": note_numérique,
    "Autre_Matière": note_numérique
  }
}

Matières possibles: Deutsch, Englisch, Französisch, Mathematik Grundlagen, Mathematik Schwerpunkt, Naturwissenschaften, Finanz- und Rechnungswesen, Wirtschaft und Recht, Geschichte und Politik, Interdisziplinäres Arbeiten.

IMPORTANT: Pour "Mathematik" dans le bulletin:
- Si c'est le semestre 1-4: utilise "Mathematik Grundlagen"
- Si c'est le semestre 5-8: utilise "Mathematik Schwerpunkt"

Si tu ne trouves pas d'information, retourne {"error": "description"}.
`;

const SAL_PROMPT = `
Analyse ce screenshot SAL (liste de contrôles). Extrait TOUS les contrôles avec leur matière, date et note. Réponds UNIQUEMENT avec un JSON valide, sans préambule, sans markdown, dans ce format exact:
{
  "semester": "current",
  "controls": [
    {
      "subject": "Nom_Matière_Canonique",
      "date": "YYYY-MM-DD",
      "name": "Nom du contrôle",
      "grade": note_numérique
    }
  ]
}

RÈGLES IMPORTANTES:
- IGNORE toutes les lignes dont le nom de matière commence par un numéro (ex: "129-INP", "202-MAT")
- Déduis la matière à partir du nom du contrôle et/ou du début du nom de matière
- Extrait la date de chaque contrôle (format YYYY-MM-DD si possible, sinon DD.MM.YYYY)
- N'utilise QUE ces noms de matières canoniques: Deutsch, Englisch, Französisch, Mathematik Grundlagen, Mathematik Schwerpunkt, Naturwissenschaften, Finanz- und Rechnungswesen, Wirtschaft und Recht, Geschichte und Politik, Interdisziplinäres Arbeiten

CORRESPONDANCES (utilise directement le nom canonique):
- DEU/Deutsch → Deutsch
- ENG/Englisch → Englisch
- FRA/Französisch → Französisch
- MAT/MG/Mathematik → Mathematik Grundlagen (ou Mathematik Schwerpunkt selon le semestre)
- NAT/NWCH/Natur → Naturwissenschaften
- FRW/Finanz → Finanz- und Rechnungswesen
- WR/Wirtschaft → Wirtschaft und Recht
- GE/Geschichte → Geschichte und Politik
- IDAF/Interdisziplinär → Interdisziplinäres Arbeiten

Si tu ne trouves pas d'information, retourne {"error": "description"}.
`;

app.post("/api/scan", async (req, res) => {
  console.log("🔵 Requête reçue sur /api/scan");
  try {
    const { image, scanType } = req.body;

    if (!image) {
      console.log("❌ Aucune image fournie");
      return res.status(400).json({ error: "Aucune image fournie" });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("❌ Clé API manquante");
      return res.status(500).json({ error: "Clé API Anthropic manquante" });
    }

    // Sélection du prompt selon le type de scan
    const prompt = scanType === 'SAL' ? SAL_PROMPT : BULLETIN_PROMPT;
    console.log(`📸 Analyse d'image en cours (type: ${scanType || 'Bulletin'})...`);
    console.log("🔑 Clé API:", process.env.ANTHROPIC_API_KEY.substring(0, 15) + "...");

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
      console.error("❌ Erreur API Anthropic:", response.status, errorText);
      return res.status(response.status).json({ error: `Erreur API: ${response.status}` });
    }

    const data = await response.json();
    console.log("✅ Réponse reçue:", JSON.stringify(data, null, 2));
    res.json(data);

  } catch (error) {
    console.error("❌ Erreur serveur:", error);
    res.status(500).json({ error: "Erreur serveur: " + error.message });
  }
});

app.listen(3001, () => {
  console.log("Backend API running on http://localhost:3001");
  console.log("Clé API chargée:", process.env.ANTHROPIC_API_KEY ? `✅ (commence par ${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...)` : "❌ MANQUANTE");
});
