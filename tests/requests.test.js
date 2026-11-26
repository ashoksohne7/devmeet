const mongoose = require("mongoose");
const { startDb, stopDb, clearDb, makeUser, connectUsers } = require("./helpers");
const app = require("../src/app");

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const ids = (res) => res.body.map((u) => u._id);

describe("sending requests", () => {
  test("interested creates a pending request", async () => {
    const a = await makeUser(app);
    const b = await makeUser(app);
    const res = await a.agent.post(`/request/send/interested/${b.user._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("interested");
  });

  test("rejects statuses that are not interested or ignored", async () => {
    const a = await makeUser(app);
    const b = await makeUser(app);
    expect((await a.agent.post(`/request/send/accepted/${b.user._id}`)).status).toBe(400);
    expect((await a.agent.post(`/request/send/whatever/${b.user._id}`)).status).toBe(400);
  });

  test("cannot send a request to yourself", async () => {
    const a = await makeUser(app);
    const res = await a.agent.post(`/request/send/interested/${a.user._id}`);
    expect(res.status).toBe(400);
  });

  test("unknown or malformed user ids fail cleanly", async () => {
    const a = await makeUser(app);
    const missing = new mongoose.Types.ObjectId().toString();
    expect((await a.agent.post(`/request/send/interested/${missing}`)).status).toBe(404);
    expect((await a.agent.post("/request/send/interested/not-an-id")).status).toBe(400);
  });

  test("duplicates are blocked in both directions", async () => {
    const a = await makeUser(app);
    const b = await makeUser(app);
    await a.agent.post(`/request/send/interested/${b.user._id}`);
    const again = await a.agent.post(`/request/send/interested/${b.user._id}`);
    const reverse = await b.agent.post(`/request/send/interested/${a.user._id}`);
    expect(again.status).toBe(400);
    expect(reverse.status).toBe(400);
    expect(again.body.message).toMatch(/already exists/i);
  });
});

describe("reviewing requests", () => {
  test("only the recipient can review, and only once", async () => {
    const a = await makeUser(app);
    const b = await makeUser(app);
    const sent = await a.agent.post(`/request/send/interested/${b.user._id}`);
    const id = sent.body.data._id;

    expect((await a.agent.post(`/request/review/accepted/${id}`)).status).toBe(404); // the sender
    expect((await b.agent.post(`/request/review/interested/${id}`)).status).toBe(400); // bad status
    expect((await b.agent.post(`/request/review/accepted/${id}`)).status).toBe(200);
    expect((await b.agent.post(`/request/review/rejected/${id}`)).status).toBe(404); // already handled
  });

  test("received requests show the sender without private fields", async () => {
    const a = await makeUser(app);
    const b = await makeUser(app);
    await a.agent.post(`/request/send/interested/${b.user._id}`);

    const mine = await b.agent.get("/user/requests/recevied");
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(1);
    const sender = mine.body.data[0].fromUserId;
    expect(sender.firstName).toBe(a.user.firstName);
    expect(sender.emailId).toBeUndefined();
    expect(sender.password).toBeUndefined();

    const theirs = await a.agent.get("/user/requests/recevied");
    expect(theirs.body.data).toHaveLength(0);
  });

  test("accepted requests become connections for both people", async () => {
    const a = await makeUser(app);
    const b = await makeUser(app);
    await connectUsers(a, b);

    const forA = await a.agent.get("/user/connections");
    const forB = await b.agent.get("/user/connections");
    expect(forA.body.data.map((u) => u._id)).toEqual([b.user._id]);
    expect(forB.body.data.map((u) => u._id)).toEqual([a.user._id]);
    forA.body.data.forEach((u) => {
      expect(u.password).toBeUndefined();
      expect(u.emailId).toBeUndefined();
    });
  });

  test("rejected requests do not become connections", async () => {
    const a = await makeUser(app);
    const b = await makeUser(app);
    const sent = await a.agent.post(`/request/send/interested/${b.user._id}`);
    await b.agent.post(`/request/review/rejected/${sent.body.data._id}`);
    expect((await a.agent.get("/user/connections")).body.data).toHaveLength(0);
  });
});

describe("feed", () => {
  test("hides me and everyone I have a request with, in both directions", async () => {
    const a = await makeUser(app);
    const b = await makeUser(app);
    const c = await makeUser(app);
    const d = await makeUser(app);

    await a.agent.post(`/request/send/interested/${b.user._id}`); // a -> b
    await c.agent.post(`/request/send/ignored/${a.user._id}`); // c -> a

    const feedA = await a.agent.get("/feed");
    expect(feedA.status).toBe(200);
    expect(ids(feedA)).toEqual([d.user._id]);

    const feedB = await b.agent.get("/feed");
    expect(ids(feedB)).toEqual(expect.arrayContaining([c.user._id, d.user._id]));
    expect(ids(feedB)).not.toContain(a.user._id);
    expect(ids(feedB)).not.toContain(b.user._id);
  });

  test("never exposes emails or passwords", async () => {
    const a = await makeUser(app);
    await makeUser(app);
    const res = await a.agent.get("/feed");
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((u) => {
      expect(u.emailId).toBeUndefined();
      expect(u.password).toBeUndefined();
    });
  });

  test("respects the limit and caps it at 50", async () => {
    const a = await makeUser(app);
    for (let i = 0; i < 3; i++) await makeUser(app);
    expect((await a.agent.get("/feed?limit=2")).body).toHaveLength(2);
    const big = await a.agent.get("/feed?limit=1000");
    expect(big.status).toBe(200);
    expect(big.body.length).toBeLessThanOrEqual(50);
  });
});
