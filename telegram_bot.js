const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL; // e.g. https://yourapp.onrender.com
const WALLET = "5CMjPiP3wop1h4GK8EqPEdSXGjAozv4r8qgAekPNv4bg";
const AMOUNT = 10;

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  await fetch(`${BACKEND_URL}/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId }),
  });

  bot.sendMessage(
    chatId,
    `To get your product, send exactly ${AMOUNT} USDC (Solana) to:\n\n` +
      `\`${WALLET}\`\n\n` +
      `I'll message you the moment it's confirmed on-chain.`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const res = await fetch(`${BACKEND_URL}/check-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriberId: chatId }),
  });
  const data = await res.json();
  bot.sendMessage(
    chatId,
    data.status === "paid"
      ? "You're all set — check above for your doc link!"
      : "Still waiting on payment. Sit tight."
  );
});

console.log("Telegram bot running...");
