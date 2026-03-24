# Where to Configure MCP Server Environment

Configure the environment **inside the `mcp-server` folder**.

## Step 1: Go to the MCP server folder

```bash
cd mcp-server
```

(From your project root, that’s `CampWise/mcp-server`.)

## Step 2: Create your `.env` file

**Option A – Copy from template (recommended)**

```bash
cp env.example .env
```

**Option B – Create `.env` manually**

Create a new file named `.env` in the `mcp-server` folder (same folder as `server.js` and `package.json`).

## Step 3: Edit `.env`

Open `mcp-server/.env` in your editor and set:

| Variable | Where to get it | Example |
|----------|------------------|---------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) (API key) | Your key |
| `BACKEND_API_URL` | Your CampWise backend URL | `http://localhost:3001` |

Minimal `.env` example:

```env
PORT=3002
BACKEND_API_URL=http://localhost:3001
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-1.5-flash
```

## File location summary

- **Config file:** `mcp-server/.env`  
- **Template:** `mcp-server/env.example`  
- **Same folder as:** `mcp-server/server.js`, `mcp-server/package.json`

Do **not** put the MCP server’s `.env` in the project root or in `server/`; it belongs only in `mcp-server/`.

## After configuring

From the project root:

```bash
cd mcp-server
npm install
npm start
```

Or from `mcp-server`:

```bash
npm start
```
