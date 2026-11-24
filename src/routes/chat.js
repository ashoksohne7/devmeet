const express = require("express");
const jwt = require("jsonwebtoken");
const chatRouter = express.Router();

const { userAuth } = require("../middleware/auth");
const Message = require("../models/message");
const { isId, chatKey, areConnected, serialize } = require("../utils/chat");

// short-lived token the browser uses to open the socket
chatRouter.get("/chat/token", userAuth, (req, res) => {
  const token = jwt.sign(
    { _id: String(req.user._id), purpose: "socket" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );
  res.json({ token });
});

// last message of every conversation (used to sort the chat list)
// must be declared before "/chat/:otherId"
chatRouter.get("/chat/summary", userAuth, async (req, res) => {
  try {
    const me = req.user._id;
    const rows = await Message.aggregate([
      { $match: { $or: [{ fromUserId: me }, { toUserId: me }] } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$chatKey", last: { $first: "$$ROOT" } } },
      { $limit: 200 },
    ]);
    const data = rows.map(({ last }) => {
      const fromMe = String(last.fromUserId) === String(me);
      return {
        userId: String(fromMe ? last.toUserId : last.fromUserId),
        text: String(last.text).slice(0, 80),
        createdAt: last.createdAt,
        fromMe,
      };
    });
    const unreadRows = await Message.aggregate([
      { $match: { toUserId: me, unread: true } },
      { $group: { _id: "$fromUserId", count: { $sum: 1 } } },
    ]);
    const unread = Object.fromEntries(unreadRows.map((r) => [String(r._id), r.count]));
    res.json({ data, unread });
  } catch (err) {
    res.status(500).send("Could not load chats.");
  }
});

chatRouter.get("/chat/:otherId", userAuth, async (req, res) => {
  try {
    const { otherId } = req.params;
    if (!isId(otherId)) return res.status(400).send("Invalid user");

    const me = String(req.user._id);
    if (!(await areConnected(me, otherId))) {
      return res.status(403).send("You can only view chats with your connections.");
    }

    const filter = { chatKey: chatKey(me, otherId) };
    if (req.query.before) {
      const d = new Date(String(req.query.before));
      if (!isNaN(d)) filter.createdAt = { $lt: d };
    }

    const rows = await Message.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    const hasMore = rows.length === 50;
    res.json({ data: rows.reverse().map(serialize), hasMore });
  } catch (err) {
    res.status(500).send("Could not load messages.");
  }
});

// mark everything this person sent me as read
chatRouter.post("/chat/:otherId/read", userAuth, async (req, res) => {
  try {
    const { otherId } = req.params;
    if (!isId(otherId)) return res.status(400).send("Invalid user");
    await Message.updateMany(
      { fromUserId: otherId, toUserId: req.user._id, unread: true },
      { $set: { unread: false } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).send("Could not update messages.");
  }
});

module.exports = chatRouter;
