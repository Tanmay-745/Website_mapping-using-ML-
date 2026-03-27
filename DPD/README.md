
  # Client Notification Workflow UI

  This is a code bundle for Client Notification Workflow UI. The original project is available at https://www.figma.com/design/Hlzx0p2Hq7KDk0nd8uYpC0/Client-Notification-Workflow-UI.

## Features

- **Lender-Specific Access Control**: Host portal shows all lenders, individual lender portals show only their data
- **JWT Authentication**: Secure login system with token-based authentication
- **Allocation Management**: Upload, view, and manage client allocations
- **Notification System**: Send bulk notifications via WhatsApp, email, SMS

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create test users:
   ```bash
   python seed_users.py
   ```

4. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## Test Users

After running the seed script, you can login with these credentials:

- **Host User** (sees all lenders): `host` / `host123`
- **Quidcash User** (sees only Quidcash data): `quidcash` / `quid123`
- **Sarvgram User** (sees only Sarvgram data): `sarvgram` / `sarv123`
- **OtherLender User** (sees only OtherLender data): `otherlender` / `other123`

## API Endpoints

- `POST /auth/token` - Login
- `POST /auth/register` - Register new user
- `GET /auth/users/me` - Get current user info
- `GET /allocations/` - Get allocations (filtered by lender)
- `POST /allocations/upload` - Upload allocations
- `POST /notifications/send` - Send notification

## Architecture

- **Host Portal**: Users with `is_host=true` can view all lender data
- **Lender Portal**: Users with specific lender assignment see only their data
- **Authentication**: JWT tokens stored in localStorage
- **Filtering**: Automatic lender-based filtering on all allocation queries
  