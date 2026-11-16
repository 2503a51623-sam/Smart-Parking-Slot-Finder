# Smart Parking Slot Finder

A full-stack academic Web Technologies project using Angular, Node.js, Express, MongoDB Community Server (local) and Google Maps JavaScript API.

## Requirements
- Node.js 22.12+ (Node 26 is fine)
- npm
- Angular CLI 22 (`npm install -g @angular/cli`)
- MongoDB Community Server running locally
- MongoDB Compass (optional GUI for viewing the database)
- Google Maps API key with Maps JavaScript API, Places API and Directions API enabled; billing may be required by Google.

## Folder layout
- `frontend/` Angular standalone application
- `backend/` Express REST API, Mongoose models and local MongoDB connection

## 1. Configure MongoDB
Start the MongoDB Community Server Windows service. The default connection is:
`mongodb://127.0.0.1:27017/smart_parking`

Open MongoDB Compass and connect using the same URI. The database and collections are created automatically when the backend first writes data.

## 2. Configure backend
Open a terminal in `backend/`:
```powershell
Copy-Item .env.example .env
npm install
npm run seed:admin
npm run dev
```
The seed command creates/updates the admin account from `.env`. Default demo credentials in `.env.example` are `admin` / `ChangeMe123!`; change them before use.

API runs at `http://localhost:5000`. Health check: `http://localhost:5000/api/health`.

## 3. Configure Google Maps
Edit `frontend/src/index.html` and replace `YOUR_GOOGLE_MAPS_API_KEY` in the script URL with your key.
Enable **Maps JavaScript API**, **Places API** and **Directions API** in Google Cloud Console. Restrict the key to your local development origin (`http://localhost:4200`) and the required APIs.
The map uses Google Maps DirectionsService/DirectionsRenderer for the real blue driving route and StreetViewPanorama for Street View. Without a valid key, the rest of the app works, but the map displays a setup message.

## 4. Run Angular
Open a second terminal in `frontend/`:
```powershell
npm install
npm start
```
Open `http://localhost:4200`.

## Demo flow
1. Register a user and log in.
2. Log in as admin using the seeded admin credentials.
3. Add a parking location with a valid address and latitude/longitude. Use the map's search box or copy coordinates from Google Maps.
4. Log in as a user, select a location, book a slot, and view My Bookings.
5. Cancel a booking and verify the available slot count increases.
6. Refresh the admin dashboard to see updated counts and bookings.

## API overview
- `POST /api/auth/register`, `/api/auth/user/login`, `/api/auth/admin/login`
- `GET /api/parking`, `GET /api/parking/:id`
- `POST /api/parking`, `PUT /api/parking/:id`, `DELETE /api/parking/:id` (admin)
- `GET /api/bookings/my`, `POST /api/bookings`, `PATCH /api/bookings/:id/cancel` (user)
- `GET /api/bookings` (admin)
- `GET /api/admin/stats` (admin)

## Important implementation notes
- Passwords are hashed with bcryptjs; JWTs are used for API authentication.
- User and admin accounts are stored in separate MongoDB collections.
- Booking creation atomically decrements `availableSlots` only when it is greater than zero. An active-booking unique index prevents the same numbered slot from being booked twice.
- This starter is intended for a local academic demonstration. For production, add HTTPS, stronger rate limiting, email verification, audit logs, and a replica set if multi-document transactions are required.
