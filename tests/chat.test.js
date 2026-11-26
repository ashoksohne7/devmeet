const jwt = require("jsonwebtoken");
const request = require("supertest");
const { startDb, stopDb, clearDb, makeUser, connectUsers } = require("./helpers");
const app = require("../src/app");
const Message = require("../src/models/message");
const { chatKey } = require("../src/utils/chat");

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const say = (from, to, text, extra = {}) =>
  Message.create({
    chatKey: chatKey(from.user._id, to.user._id),
    fromUserId: from.user._id,
    toUserId: to.user._id,
    text,
    ...extra,
  });

describe("chat token", () => {
  test("needs a login and returns a short-lived socket token", async () => {
    expect((await request(app).get("/chat/token")).status).toBe(401);

    const a = await makeUser(app);
    const res = await a.agent.get("/chat/token");
    expect(res.status).toBe(200);
    const decoded = jwt.decode(res.body.token);
    expect(decoded.purpose).toBe("socket");
    expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(300);
  });
});

describe("history", () => {
  test("only connections can read a conversation", async () => {
    const a = await makeUser(app);
    const b = await makeUser(app);
    const c = await makeUser(app);
    await connectUsers(a, b);

    expect((await a.agent.get(`/chat/${b.user._id}`)).status).toBe(200);
    expect((await a.agent.get(`/chat/${c.user._id}`)).status).toBe(403);
    expect((await a.agent.get("/chat/not-an-id")).status).toBe(400);
  });

  test("returns messages oldest first and paginates with before", async () => {
    const a = await makeUser(app);
    const b = await makeUser(app);
    await connectUsers(a, b);

    const start = Date.now() - 100000;
    await Message.insertMany(
      Array.from({ length: 55 }, (_, i) => ({
        chatKey: chatKey(a.user._id, b.user._id),
        fromUserId: i % 2 ? a.user._id : b.user._id,
        toUserId: i % 2 ? b.user._id : a.user._id,
        text: `m${i}`,
        createdAt: new Date(start + i * 1000),
      }))
    );

    const page1 = await a.agent.get(`/chat/${b.user._id}`);
    expect(page1.body.data).toHaveLength(50);
    expect(page1.body.hasMore).toBe(true);
    expect(page1.body.data[0].text).toBe("m5");
    expect(page1.body.data[49].text).toBe("m54");

    const before = encodeURIComponent(page1.body.data[0].createdAt);
    const page2 = await a.agent.get(`/chat/${b.user._id}?before=${before}`);
    expect(page2.body.data.map((m) => m.text)).toEqual(["m0", "m1", "m2", "m3", "m4"]);
    expect(page2.body.hasMore).toBe(false);
  });
});

describe("summary and unread", () => {
  test("/chat/summary is not swallowed by /chat/:otherId", async () => {
    const a = await makeUser(app);
    const res = await a.agent.get("/chat/summary");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.unread).toEqual({});
  });

  test("counts unread messages and clears them when read", async () => {
    const a = await makeUser(app);
    const b = await makeUser(app);
    await connectUsers(a, b);
    await say(b, a, "hey");
    await say(b, a, "you there?");

    const before = await a.agent.get("/chat/summary");
    expect(before.body.unread[b.user._id]).toBe(2);
    expect(before.body.data[0]).toMatchObject({ userId: b.user._id, fromMe: false });

    expect((await a.agent.post(`/chat/${b.user._id}/read`)).status).toBe(200);
    const after = await a.agent.get("/chat/summary");
    expect(after.body.unread).toEqual({});
  });

  test("someone else cannot mark my messages as read", async () => {
    const a = await makeUser(app);
    const b = await makeUser(app);
    await connectUsers(a, b);
    await say(b, a, "hey");

    await b.agent.post(`/chat/${a.user._id}/read`); // b marking a's messages, not b's own
    const res = await a.agent.get("/chat/summary");
    expect(res.body.unread[b.user._id]).toBe(1);
  });

  test("summary only lists my own conversations", async () => {
    const a = await makeUser(app);
    const b = await makeUser(app);
    const c = await makeUser(app);
    await connectUsers(a, b);
    await say(a, b, "private");

    const res = await c.agent.get("/chat/summary");
    expect(res.body.data).toEqual([]);
  });
});
