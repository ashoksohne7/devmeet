const jwt = require("jsonwebtoken");
const { io } = require("socket.io-client");
const { startDb, stopDb, makeUser, connectUsers } = require("./helpers");
const app = require("../src/app");
const Message = require("../src/models/message");

const server = app.server;
let port;
let a, b, c;
const open = [];

const connect = (token) =>
  new Promise((resolve, reject) => {
    const s = io(`http://127.0.0.1:${port}`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
    });
    s.once("connect", () => {
      open.push(s);
      resolve(s);
    });
    s.once("connect_error", (err) => {
      s.close();
      reject(err);
    });
  });

const tokenFor = async (u) => (await u.agent.get("/chat/token")).body.token;
const nextEvent = (s, event, ms = 2000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`no "${event}" event`)), ms);
    s.once(event, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });
const emitAck = (s, event, payload) => new Promise((resolve) => s.emit(event, payload, resolve));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, ms = 3000) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error("waitFor timed out");
    await wait(50);
  }
};

let sockA, sockB, sockC;

beforeAll(async () => {
  await startDb();
  await new Promise((r) => server.listen(0, r));
  port = server.address().port;

  a = await makeUser(app);
  b = await makeUser(app);
  c = await makeUser(app);
  await connectUsers(a, b); // a and b are connected, c is a stranger

  sockA = await connect(await tokenFor(a));
  sockB = await connect(await tokenFor(b));
  sockC = await connect(await tokenFor(c));
});

afterAll(async () => {
  open.forEach((s) => s.close());
  await new Promise((r) => server.close(r));
  await stopDb();
});

describe("socket authentication", () => {
  test("rejects a bad token", async () => {
    await expect(connect("nonsense")).rejects.toThrow("unauthorized");
  });

  test("a normal session token cannot open a socket", async () => {
    const sessionToken = jwt.sign({ _id: a.user._id }, process.env.JWT_SECRET);
    await expect(connect(sessionToken)).rejects.toThrow("unauthorized");
  });
});

describe("messaging", () => {
  test("delivers to the other person and stores the message", async () => {
    const incoming = nextEvent(sockB, "message:new");
    const ack = await emitAck(sockA, "message:send", { to: b.user._id, text: "hello from A", clientId: "c1" });

    expect(ack.ok).toBe(true);
    const msg = await incoming;
    expect(msg).toMatchObject({ text: "hello from A", fromUserId: a.user._id, toUserId: b.user._id, clientId: "c1" });

    const saved = await waitFor(() => Message.findOne({ text: "hello from A" }));
    expect(String(saved.fromUserId)).toBe(a.user._id);
  });

  test("refuses to message someone you are not connected to", async () => {
    let leaked = false;
    sockC.on("message:new", () => (leaked = true));

    const ack = await emitAck(sockA, "message:send", { to: c.user._id, text: "hi stranger" });
    expect(ack.ok).toBe(false);
    expect(ack.error).toMatch(/connections/i);

    await wait(300);
    expect(leaked).toBe(false);
    expect(await Message.countDocuments({ text: "hi stranger" })).toBe(0);
  });

  test("validates the payload", async () => {
    expect((await emitAck(sockA, "message:send", { to: "123", text: "x" })).ok).toBe(false);
    expect((await emitAck(sockA, "message:send", { to: b.user._id, text: "   " })).ok).toBe(false);
    const long = await emitAck(sockA, "message:send", { to: b.user._id, text: "x".repeat(1001) });
    expect(long.ok).toBe(false);
    expect(long.error).toMatch(/too long/i);
  });

  test("shows who is online, but only among your connections", async () => {
    const online = await new Promise((resolve) => sockB.emit("presence:get", resolve));
    expect(online).toContain(a.user._id);
    expect(online).not.toContain(c.user._id);
  });

  test("rate limits a flood of messages", async () => {
    const flooder = await connect(await tokenFor(a));
    const results = [];
    for (let i = 0; i < 16; i++) {
      results.push(await emitAck(flooder, "message:send", { to: b.user._id, text: `spam ${i}` }));
    }
    expect(results.slice(0, 15).every((r) => r.ok)).toBe(true);
    expect(results[15].ok).toBe(false);
    expect(results[15].error).toMatch(/too fast/i);
  });
});
