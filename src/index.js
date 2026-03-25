import express from "express";
import { Bot } from "grammy";
import fs from "fs";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = String(process.env.ADMIN_ID || "");
const PORT = process.env.PORT || 3000;
const TZ = "America/Sao_Paulo";

// ===== CONFIG DO TESTE =====
const TRIGGER_HOUR = 18;
const TRIGGER_MINUTE = 45;
const AUTO_MESSAGE = "Ok";

// ===== ARQUIVO DE ESTADO =====
const STATE_FILE = "state.json";

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    const initial = {
      targetGroupId: null,
      lastSentDate: null,
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }

  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    const fallback = {
      targetGroupId: null,
      lastSentDate: null,
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

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
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const map = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function isAfterTrigger() {
  const now = getNowParts();
  if (now.hour > TRIGGER_HOUR) return true;
  if (now.hour === TRIGGER_HOUR && now.minute >= TRIGGER_MINUTE) return true;
  return false;
}

function isAdmin(ctx) {
  return String(ctx.from?.id || "") === ADMIN_ID;
}

if (!BOT_TOKEN) throw new Error("BOT_TOKEN não definido");
if (!ADMIN_ID) throw new Error("ADMIN_ID não definido");

const app = express();
const bot = new Bot(BOT_TOKEN);

// ===== START / LEADS =====
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

// ===== COMANDOS DE ADMIN =====

// Use dentro do grupo que será monitorado
bot.command("setgroup", async (ctx) => {
  if (!isAdmin(ctx)) return;

  if (ctx.chat.type === "private") {
    await ctx.reply("Use /setgroup dentro do grupo que você quer monitorar.");
    return;
  }

  const state = loadState();
  state.targetGroupId = String(ctx.chat.id);
  saveState(state);

  await ctx.reply(
    `✅ Grupo configurado com sucesso.\n\nGrupo ID: ${ctx.chat.id}\nHorário gatilho: ${String(TRIGGER_HOUR).padStart(2, "0")}:${String(TRIGGER_MINUTE).padStart(2, "0")}\nMensagem: ${AUTO_MESSAGE}`
  );
});

// Reseta o envio do dia para poder testar novamente
bot.command("resetday", async (ctx) => {
  if (!isAdmin(ctx)) return;

  const state = loadState();
  state.lastSentDate = null;
  saveState(state);

  await ctx.reply("♻️ Estado do dia resetado. Pode testar novamente.");
});

// Ver status atual
bot.command("status", async (ctx) => {
  if (!isAdmin(ctx)) return;

  const state = loadState();
  const now = getNowParts();

  await ctx.reply(
    `📊 Status atual\n\nGrupo configurado: ${state.targetGroupId || "nenhum"}\nÚltimo envio: ${state.lastSentDate || "nenhum"}\nData atual: ${now.date}\nHora atual (${TZ}): ${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}:${String(now.second).padStart(2, "0")}\nGatilho: ${String(TRIGGER_HOUR).padStart(2, "0")}:${String(TRIGGER_MINUTE).padStart(2, "0")}`
  );
});

// ===== LÓGICA DO GRUPO =====
// Primeiro movimento HUMANO no grupo após 18:45 envia "Ok" uma única vez no dia
bot.on("message", async (ctx) => {
  try {
    if (ctx.chat.type === "private") return;
    if (!ctx.from) return;
    if (ctx.from.is_bot) return;

    const state = loadState();
    const chatId = String(ctx.chat.id);
    const now = getNowParts();

    if (!state.targetGroupId) {
      console.log("Nenhum grupo configurado ainda.");
      return;
    }

    if (chatId !== state.targetGroupId) {
      return;
    }

    if (!isAfterTrigger()) {
      console.log(`Mensagem ignorada antes do horário gatilho. Agora: ${now.hour}:${now.minute}`);
      return;
    }

    if (state.lastSentDate === now.date) {
      console.log(`Mensagem do dia já enviada em ${now.date}`);
      return;
    }

    // ignora comandos
    const text = ctx.message?.text || "";
    if (text.startsWith("/")) {
      return;
    }

    await ctx.reply(AUTO_MESSAGE);

    state.lastSentDate = now.date;
    saveState(state);

    console.log(`Mensagem automática enviada no grupo ${chatId} em ${now.date}`);
  } catch (error) {
    console.log("Erro ao processar lógica do grupo:", error.message);
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

// ===== START =====
bot.start({
  allowed_updates:
