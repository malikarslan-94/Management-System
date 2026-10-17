# CampWise

CampWise manages locations, camps, buildings, rooms, employees, visitors, and room assignments. The repository contains a React application, an Express/MongoDB API, and an optional AI chat service.

## Project documentation

Start with the [documentation index](docs/README.md).

| Guide | Contents |
| --- | --- |
| [Technical architecture](docs/TECHNICAL.md) | Architecture, frontend structure, data dictionary, integrations, and implementation limitations |
| [API reference](docs/API_REFERENCE.md) | Routes, parameters, payloads, responses, validation, and compatibility paths |
| [Application and system flows](docs/FLOWS.md) | User journeys, diagrams, state changes, failure paths, and verification scenarios |
| [Setup and operations](docs/OPERATIONS.md) | Environment configuration, startup, checks, deployment, migration, and troubleshooting |

These guides describe the source reviewed on **11 October 2026**, at baseline commit `c8c7514`. They distinguish database-backed features from local/demo behavior and known gaps. No production database or external AI service was used to prepare them.

## Local processes

| Component | Entry point | Default address |
| --- | --- | --- |
| Frontend | `npm start` from repository root | `http://localhost:5173` |
| Backend | `server/server.js` | `http://localhost:3001` |
| Optional AI service | `mcp-server/server.js` | `http://localhost:3002` |

Follow the [setup guide](docs/OPERATIONS.md) for environment-file locations and startup commands. The backend package uses `server/server.js`; `server/index.js` is a different, older entry point.
