# CampWise documentation

**Reviewed:** 11 October 2026 · **Source baseline:** `c8c7514` · **Scope:** repository implementation, not a live deployment audit.

## Reading paths

| Audience | Suggested order |
| --- | --- |
| Developer joining the project | [Technical architecture](TECHNICAL.md) → [Setup and operations](OPERATIONS.md) → [API reference](API_REFERENCE.md) |
| Product owner or operations user | [Application flows](FLOWS.md) → [implementation coverage](TECHNICAL.md#2-implementation-coverage) |
| Integration developer | [Data model](TECHNICAL.md#5-data-model) → [API reference](API_REFERENCE.md) → [assignment flow](FLOWS.md#6-room-assignment-and-check-in) |
| QA engineer | [Flows and verification scenarios](FLOWS.md) → [known limitations](TECHNICAL.md#9-known-limitations-and-engineering-priorities) → [checks](OPERATIONS.md#5-verification) |
| Deployment maintainer | [Setup and operations](OPERATIONS.md) → [runtime architecture](TECHNICAL.md#3-runtime-architecture) |

## Conventions and sources

- **Implemented** means a source path exists; it does not mean it was verified against a live database.
- **Local/demo** means browser storage, process memory, or static data.
- **Known limitation** describes behavior visible in code. Proposed improvements are identified separately.
- IDs and request examples are illustrative. Environment examples contain placeholders, never repository credentials.
- Mermaid diagrams render in compatible Markdown viewers; their source remains readable elsewhere.
- Relative source links identify the files used to establish behavior.

Primary sources are the [backend entry point](../server/server.js), [routes](../server/routes/), [models](../server/models/), [frontend routes](../src/configs/routes.config/routes.config.ts), [views](../src/views/), and [AI service](../mcp-server/). Earlier material in [ROOM_MANAGEMENT_REVIEW.md](../ROOM_MANAGEMENT_REVIEW.md) and existing AI service documents is historical context; implementation may have changed since those documents were written.

## Maintenance

When changing a feature, update its endpoint contract, persistence description, flow, and limitations together. Schema changes should also update the data dictionary and migration notes. Update the review date after checking documentation against the new implementation.
