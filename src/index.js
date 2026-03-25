import express from "express";
import { Bot } from "grammy";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const PORT = process.env.PORT || 3000;

// ====== MENSAGEM DO GRUPO ======
const AUTO_MESSAGE = `🚀 Bem-vindo(a) ao grupo!

Aqui vão as instruções:
- Fique atento às mensagens
- Siga as regras
- Aproveite o conteúdo

Qualquer dúvida, chama no privado.`;

// ====== VALIDAÇÃO ======
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN não definido");
}

if (!ADMIN_ID) {
  throw new Error("ADMIN_ID não definido");
}

// ====== APP / BOT ======
const app = express();
const bot = new Bot(BOT_TOKEN);

// ====== LEAD NO PRIVADO ======
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

// ====== NOVO MEMBRO NO GRUPO ======
bot.on("message:new_chat_members", async (ctx) => {
  try {
    console.log("Novo membro entrou no grupo:", ctx.chat.id);

    await ctx.reply(AUTO_MESSAGE);
    console.log("Mensagem automática enviada com sucesso.");
  } catch (error) {
    console.log("Erro ao enviar mensagem automática:", error.message);
  }
});

// ====== ROTA PRO RENDER ======
app.get("/", (_req, res) => {
  res.send("Bot online 🚀");
});

// ====== ERROS DO BOT ======
bot.catch((err) => {
  console.error("Erro do bot:", err.error);
});

// ====== INICIAR BOT ======
bot.start({
  allowed_updates: ["message"],
  onStart: () => {
    console.log("Bot iniciado com polling");
  },
});

// ====== INICIAR SERVIDOR ======
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
