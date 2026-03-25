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

// Lead no privado
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

// Entrada de membro no grupo
bot.on("chat_member", async (ctx) => {
  try {
    const oldStatus = ctx.chatMember.old_chat_member.status;
    const newStatus = ctx.chatMember.new_chat_member.status;

    console.log("chat_member update recebido:", {
      chatId: ctx.chat.id,
      oldStatus,
      newStatus,
      userId: ctx.chatMember.new_chat_member.user.id,
    });

    const entrouAgora =
      (oldStatus === "left" || oldStatus === "kicked") &&
      (newStatus === "member" ||
        newStatus === "administrator" ||
        newStatus === "restricted");

    if (!entrouAgora) return;

    await ctx.api.sendMessage(ctx.chat.id, AUTO_MESSAGE);
    console.log("Mensagem automática enviada no grupo:", ctx.chat.id);
  } catch (error) {
    console.log("Erro ao processar entrada no grupo:", error.message);
  }
});

// Só pra verificar se o bot está vivo
app.get("/", (_req, res) => {
  res.send("Bot online 🚀");
});

bot.catch((err) => {
  console.error("Erro do bot:", err.error);
});

// Inicia bot com allowed_updates explícitos
bot.start({
  allowed_updates: ["message", "chat_member", "my_chat_member"],
  onStart: () => {
    console.log("Bot iniciado com polling");
  },
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
