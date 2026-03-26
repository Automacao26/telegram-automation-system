import { Telegraf, Markup } from "telegraf";
import express from "express";
import fs from "fs";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());

const port = process.env.PORT || 10000;
const LEADS_FILE = "leads.json";
const STATE_FILE = "group_state.json";
const TRIGGER_HOUR = 18;
const TRIGGER_MINUTE = 40;

// ================= LEADS =================

function getLeads() {
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(LEADS_FILE));
}

function saveLead(user) {
  const leads = getLeads();
  const exists = leads.find((l) => l.id === user.id);

  if (!exists) {
    leads.push({
      id: user.id,
      username: user.username || "",
      name: user.first_name || "",
      date: new Date().toISOString(),
    });

    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
    return true;
  }

  return false;
}

async function notifyNewLead(user) {
  if (!ADMIN_ID) return;

  try {
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `🚨 Novo lead no bot\n\nNome: ${user.first_name || "Sem nome"}\n@${
        user.username || "sem username"
      }\nID: ${user.id}`
    );
  } catch (error) {
    console.log("Erro ao avisar admin:", error.message);
  }
}

// ================= ESTADO =================

function getState() {
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ lastSentDate: null }, null, 2)
    );
  }
  return JSON.parse(fs.readFileSync(STATE_FILE));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function isAfterTime() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();

  if (h > TRIGGER_HOUR) return true;
  if (h === TRIGGER_HOUR && m >= TRIGGER_MINUTE) return true;

  return false;
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

// ================= START =================

bot.start(async (ctx) => {
  const isNewLead = saveLead(ctx.from);

  if (isNewLead) {
    await notifyNewLead(ctx.from);
  }

  await ctx.reply("Olá! Em breve te respondo 😊");
});

// ================= GRUPO =================

bot.on("message", async (ctx, next) => {
  try {
    if (ctx.chat.type === "private") return next();
    if (!ctx.from || ctx.from.is_bot) return next();

    const text = ctx.message?.text || "";
    if (text.startsWith("/")) return next();

    const state = getState();

    if (!isAfterTime()) return next();
    if (state.lastSentDate === getToday()) return next();

    await ctx.reply("Ok");

    state.lastSentDate = getToday();
    saveState(state);

    console.log("✅ Mensagem enviada no grupo");
  } catch (err) {
    console.log("Erro:", err.message);
  }

  return next();
});

// ================= SERVIDOR =================

app.get("/", (_req, res) => {
  res.send("Bot online");
});

app.listen(port, async () => {
  console.log(`Servidor rodando na porta ${port}`);

  try {
    await bot.telegram.deleteWebhook();
    await bot.launch();
    console.log("🤖 Bot rodando com polling");
  } catch (e) {
    console.log("Erro ao iniciar bot:", e.message);
  }
});
