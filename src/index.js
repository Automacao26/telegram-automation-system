import express from "express";
import { Bot } from "grammy";

const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN não definido");
}

if (!ADMIN_ID) {
  throw new Error("ADMIN_ID não definido");
}

const bot = new Bot(BOT_TOKEN);

// Mensagem que vai no grupo quando entrar alguém
const AUTO_MESSAGE = `🚀 Bem-vindo(a) ao grupo!

Aqui vão as instruções:

- Fique atento às mensagens
- Siga as regras
- Aproveite o conteúdo

Qualquer dúvida, chama no privado.`;

// /start no privado
bot.command("start", async (ctx) => {
  const user = ctx.from;

  const nome = user.first_name || "Sem nome";
  const username = user.username ? `@${user.username}` : "@sem_username";
  const id = user.id;

  try {
    await bot.api.sendMessage(
      ADMIN_ID,
      `🚨 Novo lead no bot\n\nNome: ${nome}\n${username}\nID: ${id}`
    );
  } catch (e) {
    console.log("Erro ao enviar lead:", e.message);
  }

  await ctx.reply("Olá! Em breve te respondo 😊");
});

// Quando novos membros entram no grupo
bot.on("message:new_chat_members", async (ctx) => {
  try {
    await ctx.reply(AUTO_MESSAGE);
  } catch (error) {
    console.log("Erro ao enviar mensagem no grupo:", error.message);
  }
});

// rota pro Render
app.get("/", (_req, res) => {
  res.send("Bot online 🚀");
});

// inicia bot
bot.start();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando...");
});
