import express from "express";
import { Bot } from "grammy";

const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) throw new Error("BOT_TOKEN não definido");
if (!ADMIN_ID) throw new Error("ADMIN_ID não definido");

const bot = new Bot(BOT_TOKEN);

const AUTO_MESSAGE = `🚀 Bem-vindo(a) ao grupo!

Aqui vão as instruções:

- Fique atento às mensagens
- Siga as regras
- Aproveite o conteúdo

Qualquer dúvida, chama no privado.`;

// lead no privado
bot.command("start", async (ctx) => {
  const nome = ctx.from.first_name || "Sem nome";
  const username = ctx.from.username ? `@${ctx.from.username}` : "@sem_username";
  const id = ctx.from.id;

  try {
    await bot.api.sendMessage(
      ADMIN_ID,
      `🚨 Novo lead no bot\n\nNome: ${nome}\n${username}\nID: ${id}`
    );
  } catch (error) {
    console.log("Erro ao avisar admin:", error.message);
  }

  await ctx.reply("Olá! Em breve te respondo 😊");
});

// quando alguém entra no grupo
bot.on("message", async (ctx, next) => {
  try {
    const msg = ctx.message;

    if (msg?.new_chat_members && msg.new_chat_members.length > 0) {
      console.log("Novo membro entrou no grupo:", msg.new_chat_members);

      await ctx.reply(AUTO_MESSAGE);
      return;
    }
  } catch (error) {
    console.log("Erro ao processar entrada no grupo:", error.message);
  }

  await next();
});

// rota do render
app.get("/", (_req, res) => {
  res.send("Bot online 🚀");
});

// tratamento básico de erro
bot.catch((err) => {
  console.error("Erro do bot:", err.error);
});

// inicia bot
bot.start({
  onStart: () => {
    console.log("Bot iniciado com polling");
  },
});

// inicia servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
