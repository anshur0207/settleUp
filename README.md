# SettleUp

A mobile-first Splitwise-inspired expense sharing app built with React, Vite, Tailwind, Node.js, Express, MongoDB, and JWT authentication.

## Features
- Mobile-first UI with bottom navigation and floating add button
- JWT auth with signup, login, profile, and protected routes
- Group and friend management
- Expense creation with split logic and real-time activity feed placeholder
- Notification feed, analytics, and mobile-ready pages
- Backend API with Express, MongoDB, Helmet, and rate limiting

## Frontend setup
```bash
cd frontend
npm install
npm run dev
```

## Backend setup
```bash
cd backend
npm install
cp .env.example .env
# update .env with your MongoDB URI and JWT secret
npm run dev
```

## Deploy
- Frontend: Vercel
- Backend: Render or Railway
- Set `VITE_API_URL` in frontend environment to backend API URL

## Notes
- This scaffold includes a fully wired mobile-first React UI and backend routes.
- Expand the expense split logic and add socket.io for realtime updates.
