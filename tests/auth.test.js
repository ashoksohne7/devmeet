const { startDb, stopDb, clearDb, makeUser, PASSWORD } = require("./helpers");
const request = require("supertest");
const app = require("../src/app");

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const valid = {
  firstName: "Asha",
  lastName: "Rao",
  emailId: "asha@example.com",
  password: PASSWORD,
};

describe("signup", () => {
  test("creates an account, sets an httpOnly cookie and hides the password", async () => {
    const res = await request(app).post("/signup").send(valid);
    expect(res.status).toBe(201);
    expect(res.body.data.emailId).toBe("asha@example.com");
    expect(res.body.data.password).toBeUndefined();
    const cookie = (res.headers["set-cookie"] || []).join(";");
    expect(cookie).toMatch(/token=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  test("rejects a weak password", async () => {
    const res = await request(app).post("/signup").send({ ...valid, password: "abc123" });
    expect(res.status).toBe(400);
  });

  test("rejects an invalid email", async () => {
    const res = await request(app).post("/signup").send({ ...valid, emailId: "not-an-email" });
    expect(res.status).toBe(400);
  });

  test("rejects missing fields", async () => {
    const res = await request(app).post("/signup").send({ emailId: valid.emailId, password: PASSWORD });
    expect(res.status).toBe(400);
  });

  test("rejects non-string input", async () => {
    const res = await request(app)
      .post("/signup")
      .send({ ...valid, emailId: { $ne: null } });
    expect(res.status).toBe(400);
  });

  test("rejects a duplicate email with 409", async () => {
    await request(app).post("/signup").send(valid);
    const res = await request(app).post("/signup").send(valid);
    expect(res.status).toBe(409);
    expect(res.text).toMatch(/already exists/i);
  });
});

describe("login", () => {
  test("works and ignores email case", async () => {
    await request(app).post("/signup").send({ ...valid, emailId: "Case@Example.com" });
    const res = await request(app)
      .post("/login")
      .send({ emailId: "CASE@example.COM", password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.password).toBeUndefined();
    expect((res.headers["set-cookie"] || []).join(";")).toMatch(/token=/);
  });

  test("wrong password and unknown email give the same answer", async () => {
    await request(app).post("/signup").send(valid);
    const wrong = await request(app).post("/login").send({ emailId: valid.emailId, password: "Wrong@1234" });
    const unknown = await request(app).post("/login").send({ emailId: "nobody@example.com", password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.text).toBe(unknown.text);
  });

  test("blocks NoSQL injection", async () => {
    await request(app).post("/signup").send(valid);
    const res = await request(app)
      .post("/login")
      .send({ emailId: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
    expect((res.headers["set-cookie"] || []).length).toBe(0);
  });
});

describe("sessions", () => {
  test("logout clears the session", async () => {
    const u = await makeUser(app);
    expect((await u.agent.get("/profile/view")).status).toBe(200);
    const out = await u.agent.post("/logout");
    expect(out.status).toBe(200);
    expect((await u.agent.get("/profile/view")).status).toBe(401);
  });

  test("protected routes need a login", async () => {
    for (const path of ["/profile/view", "/feed", "/user/connections", "/user/requests/recevied", "/chat/token", "/chat/summary"]) {
      const res = await request(app).get(path);
      expect([path, res.status]).toEqual([path, 401]);
    }
  });

  test("a tampered cookie is rejected", async () => {
    const res = await request(app).get("/profile/view").set("Cookie", "token=garbage");
    expect(res.status).toBe(401);
  });
});
