# Server Setup Guide

## Overview

The backend server (`server/index.js`) acts as a **data bridge** that:
- Receives data from the frontend React application
- Persists data to the file system in `server/storage/`
- Provides REST API endpoints for CRUD operations

## Data Storage Structure

```
server/storage/
├── users.json                          # Global user registry
├── model_config.json                   # Global AI model configuration
├── prompts_config.json                 # Global prompts configuration
└── user-{userId}/                      # Per-user data directory
    ├── knowledge_bases.json            # User's knowledge bases
    ├── assessment_results.json         # User's latest assessment results (SRS)
    ├── assessment_history.json         # User's historical assessment logs
    └── ai_insights.json                # User's latest AI learning insights
```

## Installation & Running

### 1. Install Dependencies

```bash
npm install
```

This installs both frontend (React) and backend (Express, CORS) dependencies.

### 2. Start the Server

In one terminal:

```bash
npm run server
```

The server will start at `http://localhost:3001/api`

### 3. Start the Frontend (in another terminal)

```bash
npm run dev
```

## API Endpoints

### Authentication

- `GET /api/users` - Get all registered users
- `POST /api/auth/register` - Register new user
  ```json
  { "username": "john", "password": "pass123", "avatar": "url" }
  ```
- `POST /api/auth/login` - Login user
  ```json
  { "username": "john", "password": "pass123" }
  ```

### Knowledge Bases

- `GET /api/users/:userId/knowledge-bases` - Fetch user's knowledge bases
- `POST /api/users/:userId/knowledge-bases` - Save user's knowledge bases
  ```json
  [{ "id": "...", "title": "...", "files": [...], "graphData": {...}, "learningPath": {...} }]
  ```

### Assessment Results (SRS)

- `GET /api/users/:userId/assessment-results` - Fetch user's assessment results
- `POST /api/users/:userId/assessment-results` - Save assessment results
  ```json
  [{ "nodeId": "n1", "score": 85, "interval": 3, "repetition": 2, "nextReviewDate": 1234567890 }]
  ```

### Assessment History

- `GET /api/users/:userId/assessment-history` - Fetch user's assessment history logs
- `POST /api/users/:userId/assessment-history` - Save history logs
  ```json
  [{ "nodeId": "n1", "score": 80, "timestamp": 1234567890 }]
  ```

### AI Insights

- `GET /api/users/:userId/ai-insights` - Fetch user's AI learning insights
- `POST /api/users/:userId/ai-insights` - Save AI insights
  ```json
  { "speed": "...", "recommendation": "...", "timestamp": 1234567890 }
  ```

### Model Configuration

- `GET /api/model-config` - Fetch global model configuration
- `POST /api/model-config` - Save model configuration
  ```json
  { "modelName": "gemini-3-flash-preview", "baseUrl": "", "apiKey": "" }
  ```

### Prompts Configuration

- `GET /api/prompts-config` - Fetch global prompts configuration
- `POST /api/prompts-config` - Save custom prompts

### Backup & Restore

- `POST /api/backup` - Create a full backup (returns all data)
- `POST /api/restore` - Restore from backup (sends all data to restore)

### Health Check

- `GET /api/health` - Check server status

## Data Migration

The original `utils/storage.ts` uses **localStorage**. The new `utils/server-sync.ts` provides server-based storage functions.

### Migration Strategy

1. **Fallback Mode (Recommended)**:
   - Keep using `utils/storage.ts` for localStorage
   - Optionally call `utils/server-sync.ts` functions to sync to server
   - If server is offline, app still works with localStorage

2. **Full Migration**:
   - Replace localStorage calls with server-sync calls
   - Requires server to be running
   - Better for multi-device sync

### Example: Syncing User Data

```typescript
import { getUserData, saveUserData } from '../utils/storage'; // localStorage
import { syncUserData, fetchUserData } from '../utils/server-sync'; // server

const userId = 'user-123';

// Save to localStorage
const knowledge = [...];
saveUserData(userId, knowledge);

// Also sync to server
await syncUserData(userId, knowledge);

// Later, fetch from server if available
const serverData = await fetchUserData(userId);
if (serverData) {
  saveUserData(userId, serverData); // Update localStorage
}
```

## File Operations

All data is stored as JSON files. The server uses Node.js `fs` module for:

- **Reading**: `fs.readFileSync()` → JSON parse
- **Writing**: JSON stringify → `fs.writeFileSync()`
- **Directories**: Auto-created with `fs.mkdirSync()` + `recursive: true`

## Error Handling

The server gracefully handles:

- Missing files (returns empty arrays/null)
- Missing directories (auto-creates them)
- JSON parse errors (logs to console)
- Network errors (frontend receives null, can fall back to localStorage)

## Security Notes

⚠️ **This is a development/demo server. For production:**

1. **Password Hashing**: Use bcrypt instead of storing plain passwords
2. **Authentication**: Implement JWT tokens
3. **Validation**: Validate all request data
4. **Rate Limiting**: Add rate limiters to prevent abuse
5. **CORS**: Configure CORS more restrictively
6. **Encryption**: Consider encrypting sensitive data at rest

## Environment Variables

You can customize the server URL in the frontend:

```bash
export REACT_APP_SERVER_URL=http://your-server.com/api
```

Then import and configure in your app:

```typescript
import { setSyncConfig } from '../utils/server-sync';

setSyncConfig({ 
  enableServerSync: true,
  serverUrl: 'http://your-server.com/api'
});
```

## Troubleshooting

### Server won't start
- Check if port 3001 is in use: `netstat -ano | findstr :3001`
- Change port: `PORT=3002 npm run server`

### CORS errors
- Make sure server is running
- Check that frontend and server URLs match
- Server CORS middleware is set to accept all origins (change for production)

### Data not persisting
- Check `server/storage/` folder exists
- Check file permissions
- Verify JSON is valid in storage files

### Sync failures
- Server might be offline (check `/api/health`)
- Check browser console for network errors
- Check server console for error logs
