import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { load } from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import AfricasTalking from "africastalking";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Africa's Talking
const at = AfricasTalking({
  apiKey: process.env.AFRICASTALKING_API_KEY || "dummy",
  username: process.env.AFRICASTALKING_USERNAME || "sandbox"
});
const sms = at.SMS;

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || "");

const BASE_URL = "https://slo-countybills.go.ke";
const MAX_ITEMS = 500; // Increased to capture all bills on the page

function toAbsoluteUrl(url: string) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BASE_URL}${url}`;
}

async function resolveDownloadUrl(billId: string, retries = 2) {
  if (!billId) return null;
  const billUrl = `${BASE_URL}/bill_id?id=${billId}`;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await axios.get(billUrl, {
        timeout: 15000,
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5"
        },
        validateStatus: (status) => status < 500 
      });

      if (response.status < 500) {
        const html = response.data;
        if (!html || typeof html !== "string") return null;

        const pdfRegex = /https?:\/\/[^"'\\s>]+\.pdf|\/[^"'\\s>]+\.pdf/gi;
        const matches = html.match(pdfRegex);
        if (matches && matches.length > 0) {
          return toAbsoluteUrl([...new Set(matches)][0]);
        }
      }
    } catch (error: any) {
      console.error(`Attempt ${i + 1} for bill ${billId} failed:`, error.message);
    }
    
    // If we're here, it failed or returned 500 or no PDF found.
    if (i < retries) {
      console.log(`Retrying bill ${billId} (${i + 1}/${retries})...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    time: new Date().toISOString(),
    hasGeminiKey: !!(process.env.GEMINI_API_KEY || process.env.GEMINI_KEY),
    hasAtKey: !!process.env.AFRICASTALKING_API_KEY
  });
});

app.get("/api/bills", async (req, res) => {
  try {
    console.log("Fetching bills from", BASE_URL);
    const response = await axios.get(`${BASE_URL}/bill`, {
      timeout: 15000, 
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
      },
    });
    const $ = load(response.data);
    const billsList: any[] = [];
    const rows = $("#example tbody tr");

    if (rows.length === 0) {
      throw new Error("No bills found on remote site");
    }

    rows.each((i, el) => {
      if (billsList.length >= MAX_ITEMS) return false;
      const columns = $(el).find("td");
      if (columns.length < 4) return;

      const rowId = $(columns[0]).text().trim();
      const referenceCode = $(columns[1]).text().trim();
      const billName = $(columns[2]).text().trim();
      const currentStage = $(columns[3]).text().trim();
      
      const categoryValue = columns.length >= 7 ? $(columns[5]).text().trim() : "N/A";
      const yearValue = columns.length >= 7 ? $(columns[6]).text().trim() : $(columns[5]).text().trim() || "N/A";

      billsList.push({
        indexId: rowId,
        reference: referenceCode,
        name: billName,
        stage: currentStage,
        category: categoryValue,
        year: yearValue,
        viewUrl: `${BASE_URL}/bill_id?id=${rowId}`,
        downloadUrl: null, 
      });
    });
    res.json(billsList);
  } catch (error: any) {
    console.error("Bills fetch error:", error.message);
    // Return mock data fallback if the site is down
    const fallbackBills = [
      {
        indexId: "7",
        reference: "KMB/FIN/2024",
        name: "Kiambu County Finance Bill 2024",
        stage: "Public Participation",
        category: "Finance",
        year: "2024",
        viewUrl: "https://slo-countybills.go.ke/bill_id?id=7",
        downloadUrl: null
      },
      {
        indexId: "12",
        reference: "NRB/APP/2024",
        name: "Nairobi County Appropriation Act 2024",
        stage: "Assented",
        category: "Appropriation",
        year: "2024",
        viewUrl: "https://slo-countybills.go.ke/bill_id?id=12",
        downloadUrl: null
      }
    ];
    res.json(fallbackBills);
  }
});

app.get("/api/bill-pdf/:id", async (req, res) => {
  const url = await resolveDownloadUrl(req.params.id);
  res.json({ downloadUrl: url });
});

app.post("/api/chat", async (req, res) => {
  const { message, history, contextUrls } = req.body;
  
  try {
    const modelId = "gemini-1.5-flash";
    const systemInstruction = `You are the County Budget Watchdog AI.
Your mission is to explain Kenyan county finance documents in SIMPLE, PLAIN LANGUAGE.

GUIDELINES:
1. NO complex markdown. Use simple paragraphs and bullet points.
2. Use KES for all currency amounts.
3. If sources are provided (PDF URLs), use them to give factual answers.
5. If providing an SMS digest, keep it extremely short and clear.

Context helps: If PDF URLs are referenced, they contain the budget/bill details.`;

    const model = ai.getGenerativeModel({ 
      model: modelId,
      systemInstruction,
    });

    const chat = model.startChat({
      history: history.map((h: any) => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    // If we have context URLs, we'll prefix them to the prompt
    let userPrompt = message;
    if (contextUrls && contextUrls.length > 0) {
      userPrompt = `Reference Documents: ${contextUrls.join(", ")}\n\nQuestion: ${message}`;
    }

    const response = await chat.sendMessage(userPrompt);
    const resultText = response.response.text();

    res.json({ text: resultText });
  } catch (error: any) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "Samahani, nimepata hitilafu ya kiufundi. Tafadhali jaribu tena." });
  }
});

app.post("/api/send-sms", async (req, res) => {
  const { phoneNumber, message } = req.body;
  
  if (!phoneNumber || !message) {
    return res.status(400).json({ error: "Missing phoneNumber or message" });
  }

  try {
    const result = await sms.send({
      to: [phoneNumber],
      message: message
    });
    console.log("SMS Send Result:", result);
    res.json({ success: true, result });
  } catch (error: any) {
    console.error("SMS Send Error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
