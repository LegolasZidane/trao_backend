# 🌍 AI Travel Planner (Full Stack Project)

> **Note:** This project was built with **heavy assistance from ChatGPT (free version)** for architecture guidance, debugging, prompt engineering, and code structuring.

---

# 1. 📌 Project Overview

AI Travel Planner is a full-stack web application that generates **personalized travel itineraries using AI (Gemini API)**.
Users can register/login, create trips, and get structured day-by-day plans including:

* Activities per day
* Hotel suggestions
* Budget breakdown
* Packing list
* AI-powered day regeneration based on feedback

It also allows users to:

* Add/remove activities manually
* Mark packing items as packed
* Regenerate a specific day using AI feedback
* Manage multiple trips securely per user

---

# 2. 🧰 Chosen Tech Stack (and Why)

### Frontend

* **React (Class Components)** → Chosen for structured lifecycle handling and state management practice
* **React Router** → Routing + protected routes
* **Tailwind CSS** → Fast UI development and responsive design

### Backend

* **Node.js + Express.js** → Lightweight and scalable API server
* **MongoDB + Mongoose** → Flexible schema for dynamic itinerary data
* **JWT Authentication** → Secure stateless authentication

### AI Integration

* **Google Gemini 2.5 Flash API** → Fast and cost-efficient AI generation with structured JSON output

### Others

* **bcryptjs** → Password hashing
* **cors + dotenv** → Environment and API security handling

---

# 3. ⚙️ Setup Instructions

## 🔧 Local Setup

### 1. Clone Repository

```bash
git clone <repo-url>
cd project
```

---

## Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```env
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret
GEMINI_API_KEY=your_api_key
```

Run server:

```bash
node server.js
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Create `.env`:

```env
VITE_API_URL=http://localhost:5000
```

---

## 🌐 Deployed Setup (General)

* Frontend → Vercel
* Backend → Render
* MongoDB → MongoDB Atlas

Environment variables must be configured in deployment dashboards.

---

# 4. 🧱 High-Level Architecture

```
Frontend (React)
   |
   |  REST API (JWT Auth)
   ↓
Backend (Express.js)
   |
   |  Gemini API Request (AI Generation)
   ↓
Google Gemini API
   |
   ↓
MongoDB Database
```

### Flow:

1. User logs in → JWT issued
2. Frontend stores token
3. API requests include token in headers
4. Backend verifies token → fetches user data
5. AI generates itinerary via prompt
6. Data stored in MongoDB per user

---

# 5. 🔐 Authentication & Authorization

### Authentication:

* Users register with email + password
* Password is hashed using **bcryptjs**
* JWT token generated on login/register

### Authorization:

* Middleware checks:

```js
Authorization: Bearer <token>
```

* Token verified using `jwt.verify`
* `req.user.id` used to isolate user data

### Security Model:

* Each trip is tied to a `userId`
* Users can ONLY access their own trips

---

# 6. 🤖 AI Agent Design & Purpose

### AI Model:

* Google Gemini 2.5 Flash

### Purpose:

The AI acts as a **Travel Planning Agent** that:

* Generates structured itineraries
* Suggests hotels based on budget
* Calculates estimated budget
* Creates packing lists
* Modifies itinerary based on feedback

---

### Prompt Engineering Strategy:

Two main prompts:

#### 1. Trip Generation Prompt

* Strict JSON-only output
* Predefined schema enforcement
* Valid enums (Morning, Afternoon, etc.)
* Budget tier + interests driven planning

#### 2. Day Regeneration Prompt

* Takes existing day + user feedback
* Updates only a single day
* Maintains schema consistency

---

### AI Reliability Feature:

* **fetchWithRetry()**

  * Handles rate limits (429)
  * Exponential backoff retry system
  * Prevents API failure crashes

---

# 7. 🎯 Creative / Custom Feature

### ✨ AI-Powered Day Regeneration System

Users can:

* Write feedback like:

  > "Make day 2 more relaxed and add beach time"

AI will:

* Modify ONLY that day
* Keep structure intact
* Return valid JSON
* Update MongoDB in-place

---

### 🧠 Packing List System

* AI generates initial packing list
* Users can toggle packed/unpacked state
* Stored per trip in DB

---

### ✈️ Activity Management System

* Add custom activities per day
* Delete activities dynamically
* Auto-sorting by time of day

---

# 8. ⚖️ Key Design Decisions & Trade-offs

### 1. Class Components (React)

✔ Pros:

* Structured lifecycle handling
* Easier state grouping for forms

✖ Cons:

* More boilerplate than hooks
* Slightly outdated pattern

---

### 2. Strict JSON AI Output

✔ Pros:

* Easy backend parsing
* No UI formatting issues

✖ Cons:

* AI sometimes fails format → requires retries/validation

---

### 3. MongoDB Schema Flexibility

✔ Pros:

* Handles dynamic itinerary structure easily

✖ Cons:

* No strict relational constraints

---

### 4. Token in localStorage

✔ Pros:

* Simple implementation

✖ Cons:

* Slight XSS vulnerability risk (acceptable for MVP)

---

# 9. ⚠️ Known Limitations

* AI sometimes returns invalid JSON (handled via retry but not perfect)
* No refresh token system (JWT only)
* No real-time updates (WebSockets not used)
* No offline support
* No caching layer for AI responses
* Basic error UX (can be improved)
* No role-based admin system

---

# 10. 🙏 Acknowledgement

This project was built with **extensive help from ChatGPT (free version)** for:

* System design guidance
* API architecture decisions
* Prompt engineering
* Debugging backend/frontend issues
* Improving code structure and reliability

