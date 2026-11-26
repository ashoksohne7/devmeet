# DevMeet API

[![Tests](https://github.com/ashoksohne7/devmeet/actions/workflows/tests.yml/badge.svg)](https://github.com/ashoksohne7/devmeet/actions/workflows/tests.yml)

REST and WebSocket API for DevMeet, a matching app for developers.

**Live API:** https://devmeet-api.onrender.com/health
**Frontend repo:** https://github.com/ashoksohne7/devmeet-web

## Tech stack

Node.js, Express, Socket.io, MongoDB (Mongoose), JWT in an httpOnly cookie, bcrypt, validator, helmet, express-rate-limit. Deployed on Render with MongoDB Atlas.

## Endpoints

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | `/signup` | no | Create an account and log in |
| POST | `/login` | no | Log in and set the auth cookie |
| POST | `/logout` | no | Clear the auth cookie |
| GET | `/profile/view` | yes | Current user's profile |
| PATCH | `/profile/edit` | yes | Update allowed profile fields |
| GET | `/feed?page=1&limit=10` | yes | Paginated users you have not interacted with |
| POST | `/request/send/:status/:toUserId` | yes | `status`: `interested` or `ignored` |
| POST | `/request/review/:status/:requestId` | yes | `status`: `accepted` or `rejected` |
| GET | `/user/requests/recevied` | yes | Pending requests sent to you |
| GET | `/user/connections` | yes | Accepted connections |
| GET | `/chat/token` | yes | Short-lived token used to open the chat socket |
| GET | `/chat/summary` | yes | Last message and unread count per conversation |
| GET | `/chat/:userId` | yes | Message history with a connection (paginated) |
| POST | `/chat/:userId/read` | yes | Mark messages from a connection as read |
| GET | `/health` | no | Health check |

## Real-time chat

Messages travel over Socket.io. The browser first calls `/chat/token` (cookie auth) and uses the returned 5-minute token to open the socket. On every message the server checks that both users are connected, limits length and rate, delivers the message first and then stores it in MongoDB. Presence (online status) and typing events are broadcast only to connections.

## Run locally

```bash
npm install
```

Create a `.env` file:

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=a_long_random_string
```

```bash
npm run dev
```

The server listens on `PORT` or 7777. Set `NODE_ENV=production` in production so the auth cookie is marked `secure`.

## Testing

```bash
npm test
```

About 45 integration tests (Jest, Supertest and socket.io-client) run against an in-memory MongoDB, so they never touch a real database. They cover authentication, profile validation, the request and feed flows, chat history and unread counts, and WebSocket authorization. They also run on every push through GitHub Actions.

## Security notes

- Passwords are hashed with bcrypt and never returned in responses
- The auth token is an httpOnly, sameSite cookie
- Login errors do not reveal whether an email exists, and response time does not either
- Login, signup and all other routes are rate limited; security headers come from helmet
- Request bodies are capped, and profile edits are limited to an allow-list of fields
- Profile photos must come from the configured Cloudinary account

## Testing

Add a test database URI to your `.env` (use a separate database, never your real one):

```bash
TEST_MONGO_URI=mongodb://127.0.0.1:27017/devmeet_test
```

Then run:

```bash
npm test
```

46 integration tests (Jest, Supertest and socket.io-client) run against that MongoDB test database. They cover authentication, profile validation, the request and feed flows, chat history and unread counts, and WebSocket authorization. They also run on every push through GitHub Actions, which starts a MongoDB service for the run.