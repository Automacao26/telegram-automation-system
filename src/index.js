import express from "express";
import { Bot } from "grammy";
import fs from "fs";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = String(process.env.ADMIN_ID || "");
const PORT = process.env.PORT || 3000;
const TZ = "America/Sao_Paulo";

// ===== CONFIG =====
const TRIGGER_HOUR = 18;
const TRIGGER_MINUTE = 45;
const AUTO_MESSAGE = "Ok";
const STATE_FILE = "./state.json";

// ===== FUNÇÕES DE ESTADO =====
function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    const initialState = {
      targetGroupId: null,
      lastSentDate: null
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(initialState, null, 2));
    return initialState;
  }

  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    const fallbackState = {
      targetGroupId: null,
      lastSentDate: null
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(fallbackState, null, 2));
    return fallbackState;
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ===== HORA / DATA =====
function getNowParts() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const map = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second)
  };
}

function isAfterTrigger() {
  const now = getNowParts();

  if (now.hour > TRIGGER_HOUR) {
    return true;
  }

  if (now.hour === TRIGGER_HOUR && now.minute >= TRIGGER_MINUTE) {
    return true;
  }

  return false;
}

function isAdmin(ctx) {
  return String(ctx.from?.id || "") === ADMIN_ID;
}

// ===== VALIDAÇÃO =====
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN não definido");
}

if (!ADMIN_ID) {
  throw new Error("ADMIN_ID não definido");
}

// ===== APP / BOT =====
const app = express();
const bot = new Bot(BOT_TOKEN);

// ===== /START =====
bot.command("start", async (ctx) => {
  try {
    const nome = ctx.from?.first_name || "Sem nome";
    const username = ctx.from?.username ? `@${ctx.from.username}` : "@sem_username";
    const id = ctx.from?.id || "sem_id";

    await bot.api.sendMessage(
      ADMIN_ID,
      `🚨 Novo lead no bot\n\nNome: ${nome}\n${username}\nID: ${id}`
    );
  } catch (error) {
    console.log("Erro ao avisar admin:", error.message);
  }

  await ctx.reply("Olá! Em breve te respondo 😊");
});

// ===== DEFINE O GRUPO ALVO =====
bot.command("setgroup", async (ctx) => {
  if (!isAdmin(ctx)) {
    return;
  }

  if (ctx.chat.type === "private") {
    await ctx.reply("Use /setgroup dentro do grupo que você quer monitorar.");
    return;
  }

  const state = loadState();
  state.targetGroupId = String(ctx.chat.id);
  saveState(state);

  await ctx.reply(
    `✅ Grupo configurado.\n\nGrupo ID: ${ctx.chat.id}\nHorário gatilho: ${String(TRIGGER_HOUR).padStart(2, "0")}:${String(TRIGGER_MINUTE).padStart(2, "0")}\nMensagem: ${AUTO_MESSAGE}`
  );
});

// ===== RESETA O DIA =====
bot.command("resetday", async (ctx) => {
  if (!isAdmin(ctx)) {
    return;
  }

  const state = loadState();
  state.lastSentDate = null;
  saveState(state);

  await ctx.reply("♻️ Reset feito. Pode testar novamente.");
});

// ===== STATUS =====
bot.command("status", async (ctx) => {
  if (!isAdmin(ctx)) {
    return;
  }

  const state = loadState();
  const now = getNowParts();

  await ctx.reply(
    `📊 Status\n\nGrupo configurado: ${state.targetGroupId || "nenhum"}\nÚltimo envio: ${state.lastSentDate || "nenhum"}\nData atual: ${now.date}\nHora atual: ${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}:${String(now.second).padStart(2, "0")}\nGatilho: ${String(TRIGGER_HOUR).padStart(2, "0")}:${String(TRIGGER_MINUTE).padStart(2, "0")}`
  );
});

// ===== LÓGICA PRINCIPAL =====
// Depois de 18:45, a primeira mensagem HUMANA no grupo alvo dispara "Ok" uma vez por dia
bot.on("message", async (ctx) => {
  try {
    if (ctx.chat.type === "private") {
      return;
    }

    if (!ctx.from) {
      return;
    }

    if (ctx.from.is_bot) {
      return;
    }

    const state = loadState();
    const chatId = String(ctx.chat.id);
    const now = getNowParts();

    if (!state.targetGroupId) {
      console.log("Nenhum grupo configurado.");
      return;
    }

    if (chatId !== state.targetGroupId) {
      return;
    }

    if (!isAfterTrigger()) {
      console.log(`Ainda antes do gatilho. Agora: ${now.hour}:${now.minute}`);
      return;
    }

    if (state.lastSentDate === now.date) {
      console.log(`Mensagem já enviada hoje: ${now.date}`);
      return;
    }

    const text = ctx.message?.text || "";

    if (text.startsWith("/")) {
      return;
    }

    await ctx.reply(AUTO_MESSAGE);

    state.lastSentDate = now.date;
    saveState(state);

    console.log(`Mensagem automática enviada no grupo ${chatId} em ${now.date}`);
  } catch (error) {
    console.log("Erro na lógica do grupo:", error.message);
  }
});

// ===== EXPRESS =====
app.get("/", (_req, res) => {
  res.send("Bot online 🚀");
});

// ===== ERROS =====
bot.catch((err) => {
  console.error("Erro do bot:", err.error);
});

// ===== START BOT =====
bot.start({
  allowed_updates: ["message"],
  onStart: () => {
    console.log("Bot iniciado com polling");
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
