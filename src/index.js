import express from "express";
import { Bot } from "grammy";

const app = express();

// 🔐 CONFIGURAÇÕES (só mexe aqui)
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

// 🧠 MENSAGEM AUTOMÁTICA (troca isso pro cliente)
const AUTO_MESSAGE = `🚀 Bem-vindo!

Aqui vão as instruções do grupo:

- Fique atento às mensagens
- Siga as regras
- Aproveite o conteúdo

Qualquer dúvida, chama no privado.`;

// 🤖 BOT
const bot = new Bot(BOT_TOKEN);

// 📩 Quando alguém entrar no grupo
bot.on("chat_member", async (ctx) => {
  try {
    const status = ctx.chatMember.new_chat_member.status;

    if (status === "member") {
      await ctx.reply(AUTO_MESSAGE);
    }
  } catch (error) {
    console.log("Erro ao enviar mensagem:", error);
  }
});

// 📲 Quando alguém der /start (lead)
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
    console.log("Erro ao enviar lead:", e);
  }

  await ctx.reply("Olá! Em breve te respondo 😊");
});

// 🌐 Servidor (necessário pro Render)
app.get("/", (req, res) => {
  res.send("Bot online 🚀");
});

// 🚀 Iniciar
bot.start();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando...");
});
