# Inventory & Order Management System

Full-stack inventory, customer, and order management system.

- **Backend:** Python + FastAPI + SQLAlchemy
- **Frontend:** React (JavaScript)
- **Database:** PostgreSQL
- **Containerization:** Docker + Docker Compose

## Project Structure

```
inventory-system/
├── backend/
│   ├── app/
│   │   ├── main.py        # API routes
│   │   ├── models.py       # SQLAlchemy models
│   │   ├── schemas.py      # Pydantic schemas
│   │   └── database.py     # DB connection/session
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # Dashboard, Products, Customers, Orders
│   │   ├── App.js
│   │   └── api.js
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .dockerignore
│   ├── .env.example
│   └── package.json
├── docker-compose.yml
├── .env.example
└── .gitignore
```

## Running Locally with Docker Compose

1. Copy the env file and adjust if needed:
   ```bash
   cp .env.example .env
   ```
2. Build and start everything:
   ```bash
   docker compose up --build
   ```
3. Access:
   - Frontend: http://localhost:3000
   - Backend API docs (Swagger): http://localhost:8000/docs
   - PostgreSQL: localhost:5432

Tables are created automatically on backend startup.

## API Endpoints

| Resource | Method | Path | Description |
|---|---|---|---|
| Products | POST | `/products` | Create product |
| Products | GET | `/products` | List products |
| Products | GET | `/products/{id}` | Get product |
| Products | PUT | `/products/{id}` | Update product |
| Products | DELETE | `/products/{id}` | Delete product |
| Customers | POST | `/customers` | Create customer |
| Customers | GET | `/customers` | List customers |
| Customers | GET | `/customers/{id}` | Get customer |
| Customers | DELETE | `/customers/{id}` | Delete customer |
| Orders | POST | `/orders` | Create order (validates & deducts stock) |
| Orders | GET | `/orders` | List orders |
| Orders | GET | `/orders/{id}` | Get order |
| Orders | DELETE | `/orders/{id}` | Cancel order (restocks items) |
| Dashboard | GET | `/dashboard/summary` | Totals + low-stock list |

### Business Rules Implemented
- Product SKU is unique (DB constraint + explicit check, returns `400` on conflict).
- Customer email is unique (DB constraint + explicit check).
- Product quantity can never go negative (validated at the schema level and re-checked before stock deduction).
- An order is rejected with `400` if any line item exceeds available stock — nothing is partially committed.
- Creating an order atomically decrements stock for every line item in the same DB transaction.
- Cancelling/deleting an order restocks the items.
- Total order amount is computed server-side from current product prices — never trusted from the client.
- All endpoints return proper status codes (`201` created, `204` deleted, `400` validation/business errors, `404` not found, `422` schema validation via FastAPI/Pydantic).

## Deployment Guide

These steps must be run by you since they require your own GitHub, Docker Hub, and hosting accounts.

### 1. Push to GitHub
```bash
cd inventory-system
git init
git add .
git commit -m "Initial commit: inventory & order management system"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 2. Build & Push Backend Image to Docker Hub
```bash
cd backend
docker build -t <your-dockerhub-username>/inventory-backend:latest .
docker login
docker push <your-dockerhub-username>/inventory-backend:latest
```

### 3. Deploy Backend (Render example)
1. Create a new **PostgreSQL** instance on Render (or use Railway/Fly.io's managed Postgres).
2. Create a new **Web Service** → "Deploy an existing image from a registry" → point to your Docker Hub image, or connect the GitHub repo and let Render build the `backend/Dockerfile` directly.
3. Set environment variables on the service:
   - `DATABASE_URL` → the connection string Render gives you for the Postgres instance
   - `CORS_ORIGINS` → your frontend's deployed URL (e.g. `https://your-app.vercel.app`)
   - `LOW_STOCK_THRESHOLD` → `5` (or your preference)
4. Deploy. Note the public backend URL, e.g. `https://inventory-backend.onrender.com`.

(Railway and Fly.io follow the same pattern: provision Postgres, deploy the backend container, set the same three env vars.)

### 4. Deploy Frontend (Vercel example)
1. Import the GitHub repo into Vercel, set the **root directory** to `frontend`.
2. Build command: `npm run build`, output directory: `build` (Vercel auto-detects Create React App).
3. Set environment variable:
   - `REACT_APP_API_URL` → your live backend URL from step 3 (e.g. `https://inventory-backend.onrender.com`)
4. Deploy. Note the public frontend URL, e.g. `https://inventory-app.vercel.app`.

### 5. Final Check
- Visit the frontend URL and confirm it can create products/customers/orders against the live backend.
- Update `CORS_ORIGINS` on the backend to the exact frontend URL once known, and redeploy the backend if you initially used `*`.

## Submission Checklist
- [ ] GitHub repository link (frontend + backend code)
- [ ] Docker Hub image link for the backend
- [ ] Live frontend URL
- [ ] Live backend API URL (e.g. `/docs` should show Swagger UI)
