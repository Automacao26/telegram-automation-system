import { Telegraf } from "telegraf";
import express from "express";
import fs from "fs";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN não definido nas variáveis de ambiente");
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

const port = process.env.PORT || 10000;
const LEADS_FILE = "leads.json";
const STATE_FILE = "group_state.json";
const TRIGGER_HOUR = 20;
const TRIGGER_MINUTE = 0;
const TZ = "America/Sao_Paulo";

// ================= LEADS =================

function getLeads() {
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(LEADS_FILE, "utf8"));
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
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getSaoPauloParts() {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || "00";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function isAfterTime() {
  const now = getSaoPauloParts();
  const h = now.hour;
  const m = now.minute;

  if (h > TRIGGER_HOUR) return true;
  if (h === TRIGGER_HOUR && m >= TRIGGER_MINUTE) return true;

  return false;
}

function getToday() {
  const now = getSaoPauloParts();
  return `${now.year}-${now.month}-${now.day}`;
}

// ================= BOT =================

bot.start(async (ctx) => {
  const isNewLead = saveLead(ctx.from);

  if (isNewLead) {
    await notifyNewLead(ctx.from);
  }

  await ctx.reply("Olá! Em breve te respondo 😊");
});

bot.command("teste", async (ctx) => {
  await ctx.reply("teste ok");
});

bot.on("message", async (ctx, next) => {
  try {
    console.log("Mensagem recebida");
    console.log("chat.type:", ctx.chat?.type);
    console.log("chat.id:", ctx.chat?.id);
    console.log("texto:", ctx.message?.text || "[sem texto]");

    if (ctx.chat?.type === "private") return next();
    if (!ctx.from || ctx.from.is_bot) return next();

    const text = ctx.message?.text || "";
    if (text.startsWith("/")) return next();

    const state = getState();

    console.log("Horário SP após 20h?", isAfterTime());
    console.log("Última data enviada:", state.lastSentDate);
    console.log("Hoje:", getToday());

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

// ================= SERVIDOR / WEBHOOK =================

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Bot online");
});

const WEBHOOK_PATH = `/webhook/${BOT_TOKEN}`;

app.post(WEBHOOK_PATH, async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.log("Erro no webhook:", error.message);
    res.sendStatus(500);
  }
});

app.listen(port, async () => {
  console.log(`Servidor rodando na porta ${port}`);

  try {
    const renderUrl = process.env.RENDER_EXTERNAL_URL;

    if (!renderUrl) {
      throw new Error("RENDER_EXTERNAL_URL não definida");
    }

    const WEBHOOK_URL = `${renderUrl}${WEBHOOK_PATH}`;

    await bot.telegram.setWebhook(WEBHOOK_URL);
    console.log("✅ Webhook configurado:", WEBHOOK_URL);
  } catch (e) {
    console.log("Erro ao iniciar bot:", e.message);
  }
});
