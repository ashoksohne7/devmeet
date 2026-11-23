# DevMeet API

REST API for DevMeet, a Tinder-style app for developers.

**Live API:** https://devmeet-api.onrender.com
**Frontend repo:** https://github.com/ashoksohne7/devmeet-web

## Tech stack

Node.js, Express, MongoDB (Mongoose), JWT in an httpOnly cookie, bcrypt, validator, helmet, express-rate-limit. Deployed on Render with MongoDB Atlas.

## Endpoints

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | `/signup` | no | Create an account |
| POST | `/login` | no | Log in and set the auth cookie |
| POST | `/logout` | no | Clear the auth cookie |
| GET | `/profile/view` | yes | Current user's profile |
| PATCH | `/profile/edit` | yes | Update allowed profile fields |
| GET | `/feed?page=1&limit=10` | yes | Paginated users you have not interacted with |
| POST | `/request/send/:status/:toUserId` | yes | `status`: `interested` or `ignored` |
| POST | `/request/review/:status/:requestId` | yes | `status`: `accepted` or `rejected` |
| GET | `/user/requests/recevied` | yes | Pending requests sent to you |
| GET | `/user/connections` | yes | Accepted connections |
| GET | `/health` | no | Health check |

## Run locally

```bash
npm install
```

Create a `.env` file:
MONGO_URI=mongodb+srv://ashoksohne77_db_user:AshokSohne777@cluster0.cqycppx.mongodb.net/devMeet
JWT_SECRET=a10ba1466eadc86bb8424176cfe7e6c53973c7d3f57dfa8c055b2ee161000ebd


```bash
npm run dev
```

The server listens on `PORT` or 7777.

## Security notes

- Passwords are hashed with bcrypt and never returned in responses
- The auth token is an httpOnly, sameSite cookie
- Login errors do not reveal whether an email exists
- Login and signup are rate limited, and security headers are set with helmet
- Profile edits are restricted to an allow-list of fields
