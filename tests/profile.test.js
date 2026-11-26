const { startDb, stopDb, clearDb, makeUser } = require("./helpers");
const app = require("../src/app");

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe("GET /profile/view", () => {
  test("returns my profile without the password", async () => {
    const u = await makeUser(app);
    const res = await u.agent.get("/profile/view");
    expect(res.status).toBe(200);
    expect(res.body.emailId).toBe(u.email);
    expect(res.body.password).toBeUndefined();
  });
});

describe("PATCH /profile/edit", () => {
  test("updates allowed fields and never returns the password", async () => {
    const u = await makeUser(app);
    const res = await u.agent
      .patch("/profile/edit")
      .send({ about: "I build things", skills: ["react", "node"], age: 25, gender: "female" });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain(u.user.firstName);
    expect(res.body.data.about).toBe("I build things");
    expect(res.body.data.password).toBeUndefined();

    const view = await u.agent.get("/profile/view");
    expect(view.body.skills).toEqual(["react", "node"]);
    expect(view.body.age).toBe(25);
  });

  test.each([
    ["emailId", { emailId: "hacker@example.com" }],
    ["password", { password: "Hacked@1234" }],
    ["_id", { _id: "64b000000000000000000000" }],
  ])("rejects editing %s", async (_name, body) => {
    const u = await makeUser(app);
    const res = await u.agent.patch("/profile/edit").send(body);
    expect(res.status).toBe(400);
    const view = await u.agent.get("/profile/view");
    expect(view.body.emailId).toBe(u.email);
  });

  test("validates age, gender, about length and skill count", async () => {
    const u = await makeUser(app);
    expect((await u.agent.patch("/profile/edit").send({ age: 10 })).status).toBe(400);
    expect((await u.agent.patch("/profile/edit").send({ gender: "robot" })).status).toBe(400);
    expect((await u.agent.patch("/profile/edit").send({ about: "x".repeat(501) })).status).toBe(400);
    const eleven = Array.from({ length: 11 }, (_, i) => `skill${i}`);
    expect((await u.agent.patch("/profile/edit").send({ skills: eleven })).status).toBe(400);
  });

  test("photos must come from our Cloudinary account", async () => {
    const u = await makeUser(app);
    const evil = await u.agent.patch("/profile/edit").send({ photoUrl: "https://evil.example.com/a.png" });
    expect(evil.status).toBe(400);

    const ok = await u.agent.patch("/profile/edit").send({
      photoUrl: "https://res.cloudinary.com/yrl4lnm8/image/upload/v1/devmeet/a.jpg",
    });
    expect(ok.status).toBe(200);
  });

  test("needs a login", async () => {
    const request = require("supertest");
    const res = await request(app).patch("/profile/edit").send({ about: "hi" });
    expect(res.status).toBe(401);
  });
});
