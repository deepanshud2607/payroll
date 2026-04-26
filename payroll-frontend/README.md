# PayFlow Frontend

A beautiful dark-theme payroll management frontend for the PayFlow backend.

## Setup & Installation

### Prerequisites
- Node.js 18+
- Your backend running at `http://localhost:3000`

### Steps

```bash
# 1. Navigate into the folder
cd payroll-frontend

# 2. Install dependencies
npm install

# 3. (Optional) Create a .env file to change the API URL
echo "VITE_API_URL=http://localhost:3000" > .env

# 4. Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Features

### Three Portals
| Role | Path | Login |
|------|------|-------|
| Organization | `/org/login` | email + password |
| Admin | `/admin/login` | uniqueId + password |
| Employee | `/employee/login` | uniqueEmployeeId + password |

### Organization Portal
- Dashboard with payroll overview
- Employee list with search
- Pending approval requests (approve / reject)
- Payroll Hub — pay one or bulk, with raise/deduct adjustments
- Settings — branding, bank accounts

### Admin Portal
- Dashboard
- Employee list
- Approval requests
- Payroll — pay one or bulk
- My Profile — add bank accounts

### Employee Portal
- Profile overview with payment status badge
- Full payment history
- Change password

---

## Build for production

```bash
npm run build
# Outputs to ./dist — serve with any static host
```
