const express = require("express");
const app = express();
app.use(express.json());

// ---- CONFIG ----
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const YOUR_WALLET = "5CMjPiP3wop1h4GK8EqPEdSXGjAozv4r8qgAekPNv4bg";
const EXPECTED_AMOUNT = 10; // USDC
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GOOGLE_DOC_LINK = process.env.GOOGLE_DOC_LINK;

// In-memory store for demo purposes — swap for a real DB (Postgres/SQLite) in production
const orders = {}; // { telegram_chat_id: { status: "pending" | "paid", amount, timestamp } }

// ---- Telegram: /start command sets up a pending order ----
app.post("/create-order", (req, res) => {
  const { chatId } = req.body;
  orders[chatId] = { status: "pending", amount: EXPECTED_AMOUNT, timestamp: Date.now() };
  res.json({ ok: true });
});

// ---- Helius webhook: fires when a transfer hits your wallet ----
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
          await sendTelegramMessage(
            pendingId,
            `Payment confirmed ✅\nHere's your doc: ${GOOGLE_DOC_LINK}`
          );
        }
      }
    }
  }
  res.sendStatus(200);
});

// ---- ManyChat calls this to check payment status ----
app.post("/check-payment", (req, res) => {
  const { subscriberId } = req.body;
  const order = orders[subscriberId];
  if (!order) return res.json({ status: "not_found" });
  res.json({ status: order.status });
});

// ---- Helper: send a Telegram message ----
async function sendTelegramMessage(chatId, text) {
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    }
  );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
