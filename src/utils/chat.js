const ConnectionRequest = require("../models/connectionRequest");

const isId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);
const chatKey = (a, b) => [String(a), String(b)].sort().join("_");

const cache = new Map();
async function areConnected(a, b) {
  const key = chatKey(a, b);
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.ok;

  const found = await ConnectionRequest.exists({
    status: "accepted",
    $or: [
      { fromUserId: a, toUserId: b },
      { fromUserId: b, toUserId: a },
    ],
  });
  const ok = !!found;
  cache.set(key, { ok, exp: Date.now() + (ok ? 60000 : 5000) });
  if (cache.size > 5000) cache.clear();
  return ok;
}

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

module.exports = { isId, chatKey, areConnected, friendIds, serialize };
