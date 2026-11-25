const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Message = require("./models/message");
const { isId, chatKey, areConnected, markConnected, friendIds } = require("./utils/chat");

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://devmeet-web-ashy.vercel.app",
  ...(process.env.CLIENT_ORIGINS ? process.env.CLIENT_ORIGINS.split(",") : []),
];

const online = new Map(); // userId -> open connection count

module.exports = function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: ALLOWED_ORIGINS },
    maxHttpBufferSize: 5000,
    // notice dead connections faster and keep proxies from closing idle ones
    pingInterval: 15000,
    pingTimeout: 10000,
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.purpose !== "socket") throw new Error("bad token");
      socket.data.userId = String(decoded._id);
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  const notifyFriends = async (me, isOnline) => {
    const ids = await friendIds(me);
    ids.forEach((id) =>
      io.to(`user:${id}`).emit("presence:update", { userId: me, online: isOnline })
    );
  };

  io.on("connection", (socket) => {
    const me = socket.data.userId;
    socket.join(`user:${me}`);

    const count = online.get(me) || 0;
    online.set(me, count + 1);
    if (count === 0) notifyFriends(me, true).catch(() => {});

    // the client asks for this on connect, on tab focus and every 30 seconds
    socket.on("presence:get", async (cb) => {
      if (typeof cb !== "function") return;
      try {
        const ids = await friendIds(me);
        ids.forEach((id) => markConnected(me, id)); // warm the cache for the first message
        cb(ids.filter((id) => online.has(id)));
      } catch {
        cb([]);
      }
    });

    // at most 15 messages per 10 seconds per connection
    const stamps = [];
    const allowed = () => {
      const now = Date.now();
      while (stamps.length && now - stamps[0] > 10000) stamps.shift();
      if (stamps.length >= 15) return false;
      stamps.push(now);
      return true;
    };

    socket.on("message:send", async (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      try {
        if (!allowed()) return reply({ ok: false, error: "You are sending messages too fast." });

        const to = payload?.to;
        const text = typeof payload?.text === "string" ? payload.text.trim() : "";
        const clientId =
          typeof payload?.clientId === "string" ? payload.clientId.slice(0, 40) : undefined;

        if (!isId(to)) return reply({ ok: false, error: "Invalid recipient." });
        if (!text) return reply({ ok: false, error: "Message cannot be empty." });
        if (text.length > 1000) return reply({ ok: false, error: "Message is too long." });
        if (!(await areConnected(me, to))) {
          return reply({ ok: false, error: "You can only message your connections." });
        }

        const _id = new mongoose.Types.ObjectId();
        const createdAt = new Date();
        const out = { _id: String(_id), fromUserId: me, toUserId: to, text, createdAt, clientId };

        // deliver first, so nobody waits for the database
        io.to(`user:${to}`).to(`user:${me}`).emit("message:new", out);
        reply({ ok: true });

        // then save; if that fails, take the message back from both sides
        try {
          await Message.create({
            _id,
            chatKey: chatKey(me, to),
            fromUserId: me,
            toUserId: to,
            text,
            createdAt,
          });
        } catch {
          io.to(`user:${me}`).emit("message:failed", { _id: out._id, clientId, notice: true });
          io.to(`user:${to}`).emit("message:failed", { _id: out._id });
        }
      } catch {
        reply({ ok: false, error: "Message could not be sent." });
      }
    });

    socket.on("typing", async (p) => {
      try {
        const to = p?.to;
        if (!isId(to) || !(await areConnected(me, to))) return;
        io.to(`user:${to}`).emit("typing", { from: me, typing: !!p.typing });
      } catch {}
    });

    socket.on("disconnect", () => {
      const left = (online.get(me) || 1) - 1;
      if (left <= 0) {
        online.delete(me);
        notifyFriends(me, false).catch(() => {});
      } else {
        online.set(me, left);
      }
    });
  });

  return io;
};
