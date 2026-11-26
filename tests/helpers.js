process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "jest-only-secret";

const request = require("supertest");
const mongoose = require("mongoose");

let memory = null;

async function startDb() {
  require("../src/models/user");
  require("../src/models/connectionRequest");
  require("../src/models/message");

  const uri = process.env.TEST_MONGO_URI;
  if (uri) {
    // never run tests against the real database
    const dbName = new URL(uri).pathname.replace("/", "");
    if (!/test/i.test(dbName)) {
      throw new Error("TEST_MONGO_URI must point to a database whose name contains 'test'");
    }
    await mongoose.connect(uri);
  } else {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    memory = await MongoMemoryServer.create({
      binary:{ version: "7.0.14"},
    });
    await mongoose.connect(memory.getUri("devmeet_test"));
  }
  // build indexes (unique email) before the tests start
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

async function stopDb() {
  await mongoose.disconnect();
  if (memory) await memory.stop();
}

async function clearDb() {
  const cols = Object.values(mongoose.connection.collections);
  await Promise.all(cols.map((c) => c.deleteMany({})));
}

const PASSWORD = "Test@1234";
let counter = 0;

async function makeUser(app, overrides = {}) {
  counter += 1;
  const agent = request.agent(app);
  const body = {
    firstName: `User${counter}`,
    lastName: "Test",
    emailId: `user${counter}@example.com`,
    password: PASSWORD,
    ...overrides,
  };
  const res = await agent.post("/signup").send(body);
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${res.text}`);
  return { agent, user: res.body.data, email: body.emailId, password: body.password };
}

// a sends a request to b and b accepts it; returns the request id
async function connectUsers(a, b) {
  const sent = await a.agent.post(`/request/send/interested/${b.user._id}`);
  if (sent.status !== 200) throw new Error(`send failed: ${sent.status} ${sent.text}`);
  const reviewed = await b.agent.post(`/request/review/accepted/${sent.body.data._id}`);
  if (reviewed.status !== 200) throw new Error(`accept failed: ${reviewed.status} ${reviewed.text}`);
  return sent.body.data._id;
}

module.exports = { startDb, stopDb, clearDb, makeUser, connectUsers, PASSWORD };
