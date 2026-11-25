const ConnectionRequest = require("../models/connectionRequest");

const isId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);
const chatKey = (a, b) => [String(a), String(b)].sort().join("_");

const cache = new Map();
const remember = (a, b, ok, ttl) => {
  cache.set(chatKey(a, b), { ok, exp: Date.now() + ttl });
  if (cache.size > 5000) cache.clear();
};

async function areConnected(a, b) {
  const hit = cache.get(chatKey(a, b));
  if (hit && hit.exp > Date.now()) return hit.ok;

  const found = await ConnectionRequest.exists({
    status: "accepted",
    $or: [
      { fromUserId: a, toUserId: b },
      { fromUserId: b, toUserId: a },
    ],
  });
  const ok = !!found;
  remember(a, b, ok, ok ? 60000 : 5000);
  return ok;
}

// use when the database has already told us two users are connected
const markConnected = (a, b) => remember(a, b, true, 60000);

async function friendIds(userId) {
  const rows = await ConnectionRequest.find({
    status: "accepted",
    $or: [{ fromUserId: userId }, { toUserId: userId }],
  })
    .select("fromUserId toUserId")
    .lean();
  return rows.map((r) =>
    String(r.fromUserId) === String(userId) ? String(r.toUserId) : String(r.fromUserId)
  );
}

const serialize = (m) => ({
  _id: String(m._id),
  fromUserId: String(m.fromUserId),
  toUserId: String(m.toUserId),
  text: m.text,
  createdAt: m.createdAt,
});

module.exports = { isId, chatKey, areConnected, markConnected, friendIds, serialize };
