const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

// ---- CONFIG ----
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const YOUR_WALLET = "5CMjPiP3wop1h4GK8EqPEdSXGjAozv4r8qgAekPNv4bg";
const EXPECTED_AMOUNT = 10; // USDC
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GOOGLE_DOC_LINK = process.env.GOOGLE_DOC_LINK;

const orders = {};

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  orders[chatId] = { status: "pending", amount: EXPECTED_AMOUNT, timestamp: Date.now() };

  bot.sendMessage(
    chatId,
    `To get your product, send exactly ${EXPECTED_AMOUNT} USDC (Solana) to:\n\n` +
      `\`${YOUR_WALLET}\`\n\n` +
      `I'll message you the moment it's confirmed on-chain.`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const order = orders[chatId];
  bot.sendMessage(
    chatId,
    order && order.status === "paid"
      ? "You're all set — check above for your doc link!"
      : "Still waiting on payment. Sit tight."
  );
});

app.post("/webhook/payment", async (req, res) => {
  const events = req.body;
  for (const event of events) {
    const transfers = event.tokenTransfers || [];
    for (const t of transfers) {
      if (
        t.mint === USDC_MINT &&
        t.toUserAccount === YOUR_WALLET &&
        Math.abs(t.tokenAmount - EXPECTED_AMOUNT) < 0.01
      ) {
        const pendingId = Object.keys(orders).find(
          (id) => orders[id].status === "pending"
        );
        if (pendingId) {
          orders[pendingId].status = "paid";
          bot.sendMessage(
            pendingId,
            `Payment confirmed ✅\nHere's your doc: ${GOOGLE_DOC_LINK}`
          );
        }
      }
    }
  }
  res.sendStatus(200);
});

app.get("/", (req, res) => res.send("crypto-bot is running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
