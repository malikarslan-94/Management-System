# CampWise API reference

**Reviewed:** 11 October 2026 · **Baseline:** `c8c7514` · [Documentation index](README.md)

This describes [server/server.js](../server/server.js) and its mounted routers. It documents current behavior, including inconsistencies. The frontend origin setting should be `http://localhost:3001`, without `/api`; clients add the prefix.

## 1. Conventions

- Main API: `http://localhost:3001/api`; health: `http://localhost:3001/health`.
- Optional AI service: `http://localhost:3002/mcp`.
- JSON requests use `Content-Type: application/json`. IDs are MongoDB ObjectId strings. Dates serialize as ISO strings.
- Dedicated hierarchy lists return arrays. Employees and assignments return paginated envelopes. Creates usually return 201; reads/updates/deletes generally return 200.
- Dedicated updates normally use PATCH; assignment checkout/status updates use PUT.
- Most route errors use `{ "message": "..." }`; authentication/generic handlers commonly use `{ "error": "..." }`.
- Bearer JWT infrastructure exists, but the active backend does not mount authentication middleware. This reference does not imply endpoints are protected.
- Parent status does not automatically cascade to children. An inactive camp does not automatically make its rooms unassignable.

Paginated response:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 10,
  "totalPages": 0
}
```

`total` is the filtered database count. Defaults are page 1/limit 10. Pagination input is parsed with parseInt without comprehensive bounds validation. Do not assume a server-enforced maximum.

## 2. Authentication and health

| Method | Path | Request | Response / notes |
| --- | --- | --- | --- |
| POST | `/api/sign-up` | name, email, password | 201 `{token,user:{id,name,email,role}}`; always sets admin |
| POST | `/api/sign-in` | user, password | 200 `{token,user:{id,name,role}}`; user is account name |
| GET | `/health` | None | `{status:"OK",timestamp,database:"Connected" or "Disconnected"}` |

```json
{
  "user": "example.operator",
  "password": "<account-password>"
}
```

Sign-in rejects missing users/bad passwords with 400 `Invalid credentials`. Sign-up rejects an existing email with 400; other save errors fall into a general 500 handler. JWT expiry is 24 hours. There is no active `/api/sign-out`, `/api/forgot-password`, or `/api/reset-password` implementation despite frontend service calls. Health returns a database-state label but does not change the HTTP status to signal readiness.

## 3. Locations

Source: [locations.js](../server/routes/locations.js).

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/locations` | All locations, name ascending, live campCount/roomCount |
| GET | `/api/locations/:id` | One location and counts |
| GET | `/api/locations/:id/camps` | Camps referencing location; populates location name/city/address |
| POST | `/api/locations` | Create location |
| PATCH | `/api/locations/:id` | Edit allowed fields; rename synchronizes Camp.location label |
| DELETE | `/api/locations/:id` | Hard delete, blocked while camps reference it |

Create/update fields: name, city, address, description, image, coordinates `{lat,lng}`, status. Name is required for create; status defaults active. Create performs a case-insensitive name pre-check (409). The database also has a unique name index. PATCH does not repeat the case-insensitive pre-check. Null update values are ignored by the dedicated field loop.

```json
{
  "name": "North Region",
  "city": "Example City",
  "address": "Industrial Road",
  "status": "active"
}
```

Missing ID: 404; invalid ID: 400 through hierarchy error handling. Child-list requests query children and do not independently prove parent existence. Delete returns `{message:"Location deleted successfully"}`.

## 4. Camps and buildings

Sources: [camps.js](../server/routes/camps.js), [buildings.js](../server/routes/buildings.js).

### Camps

| Method | Path | Inputs / behavior |
| --- | --- | --- |
| GET | `/api/camps` | Optional locationId filter; name ascending; populated location and live counts |
| GET | `/api/camps/:id` | Camp, populated location, live counts |
| GET | `/api/camps/:id/buildings` | Building list with roomCount, name ascending |
| POST | `/api/camps` | name, locationId; optional inline buildings |
| PATCH | `/api/camps/:id` | locationId, name, description, price, image, rating, status |
| DELETE | `/api/camps/:id` | Hard delete; rejects if rooms or buildings remain |

Create example:

```json
{
  "name": "Camp Alpha",
  "locationId": "<location-id>",
  "description": "Staff accommodation",
  "price": 0,
  "status": "active",
  "buildings": [
    { "name": "Block A", "type": "residential", "floors": 3 },
    { "name": "Block B", "type": "residential", "floors": 2 }
  ]
}
```

The location must exist. The handler derives legacy `location` from its name. Inline building names are trimmed; blank entries are filtered out, duplicate names within the request are rejected case-insensitively, and floors must be integers ≥ 1. Inline status is set active. Buildings are optional at the API level even though the primary UI requires a structure.

Creation attempts a MongoDB transaction. Unsupported-transaction errors trigger sequential creation with a compensating camp delete. That fallback does not clean up partially created buildings. Response is the camp and computed counts, not a nested building array. Moving a camp updates locationId and its label. Delete does not check facility or employee references.

### Buildings

| Method | Path | Inputs / behavior |
| --- | --- | --- |
| GET | `/api/buildings` | Optional campId; populated camp; counts; name ascending |
| GET | `/api/buildings/:id` | One building with counts |
| GET | `/api/buildings/:id/rooms` | Rooms, populated camp/building, sorted floor then number |
| GET | `/api/buildings/:id/floors` | Array `{floor,roomCount}` for every floor from 1 to building.floors |
| POST | `/api/buildings` | campId, name; optional type, floors, description, status |
| PATCH | `/api/buildings/:id` | name, type, floors, description, status; campId not editable |
| DELETE | `/api/buildings/:id` | Hard delete; blocked while rooms reference it |

Floors default to 1 and must be integers ≥ 1. Shrinking below the highest existing room floor is blocked, regardless of occupancy status. Building count responses include roomCount, availableRooms, occupiedRooms. Floor summaries contain total room counts, not separate occupancy counts.

## 5. Rooms

Source: [rooms.js](../server/routes/rooms.js).

| Method | Path | Inputs / behavior |
| --- | --- | --- |
| GET | `/api/rooms` | Filters: campId, buildingId, floor, status; returns array |
| GET | `/api/rooms/camp/:campId` | Legacy camp list alias |
| GET | `/api/rooms/building/:buildingId` | Building list alias |
| GET | `/api/rooms/:id` | Single populated room |
| POST | `/api/rooms` | Create room |
| POST | `/api/rooms/bulk` | Generate rooms from floor specifications |
| PATCH | `/api/rooms/:id` | Edit room and/or validated placement |
| DELETE | `/api/rooms/:id` | Hard delete; no dependent assignment/employee guard |

Lists sort by floor then roomNumber. roomNumber sorting is string ordering, not guaranteed numeric ordering. Populated camp includes name/location/locationId; populated building includes name/type/floors.

### Single creation and update

```json
{
  "buildingId": "<building-id>",
  "floor": 1,
  "roomNumber": "A-101",
  "type": "double",
  "capacity": 2,
  "price": 150,
  "amenities": ["WiFi", "AC"],
  "status": "available"
}
```

Create requires buildingId, roomNumber, type, capacity. Floor defaults to 1. Price defaults 0, arrays default empty, description empty, status available. Server derives camp from the building. Valid room types: single/double/suite/family. Valid statuses: available/occupied/maintenance/cleaning.

PATCH accepts buildingId, floor, roomNumber, type, capacity, price, amenities, status, images, description. A placement change revalidates floor bounds and rederives camp. A submitted camp alone is ignored by this handler. Legacy `isAvailable` maps to available/occupied only if status is omitted. Generic PUT behaves differently; use dedicated PATCH.

Status edits do not create, complete, or cancel assignments. Moving an occupied room does not reconcile employee camp metadata. Delete returns `{message:"Room deleted"}`.

### Bulk generation

```json
{
  "buildingId": "<building-id>",
  "floors": [
    {
      "floor": 1,
      "count": 3,
      "startNumber": "A-01",
      "type": "double",
      "capacity": 2,
      "price": 150,
      "amenities": ["WiFi"]
    }
  ]
}
```

This plans A-01, A-02, A-03. The suffix must be numeric; prefix and zero-padding are preserved. Each specification requires an integer count 1–500 and integer capacity ≥ 1, a type, and a valid floor. The limit is **per floor specification**, not a request-wide room cap.

Repeated planned numbers are rejected case-insensitively. Existing-number checks and the index use the stored values without a case-insensitive collation. A conflict returns 409 before insert; otherwise response is 201 `{created:<number>,rooms:[...]}`. Inserted records default available and are returned without the normal list population. Preflight is not a transaction: a race/database error can still produce a partial insertion.

## 6. Employees and visitors

Source: [employees.js](../server/routes/employees.js).

| Method | Path | Inputs / behavior |
| --- | --- | --- |
| GET | `/api/employees` | employeeType, department, campId, status, page, limit |
| GET | `/api/employees/:id` | Employee, populated camp/current room/history rooms |
| POST | `/api/employees` | Create employee/visitor |
| PATCH | `/api/employees/:id` | Update profile and optional room pointer/history |
| DELETE | `/api/employees/:id` | Soft delete: status becomes Inactive |

Lists use exact-match filters, sort newest first, and return the paginated envelope. There is no backend free-text search parameter. List population includes camp name/location and room number/type. Detail additionally populates embedded history room references.

```json
{
  "firstName": "Example",
  "lastName": "Resident",
  "email": "resident@example.com",
  "phone": "+0000000000",
  "iqamaNumber": "EXAMPLE-IQ-001",
  "employeeId": "EXAMPLE-EMP-001",
  "employeeType": "Permanent",
  "department": "Operations",
  "designation": "Coordinator",
  "campId": "<camp-id>",
  "status": "Active"
}
```

Required: firstName, lastName, email, phone, iqamaNumber, employeeId. Optional: location, project, department, designation, employeeType, campId, currentRoomId, status. Visitors use employeeType Visitor and still need identity/contact fields. Email/iqama/employee ID duplicates return 400; invalid parent references may return 404.

Supplying currentRoomId validates room existence and adds embedded history. PATCH room changes close an open prior history item and add a new one; null clears the pointer. Neither path creates RoomAssignment nor changes Room.status. Deactivation changes only employee status and does not check out the room. The end-visit UI uses PATCH `{status:"Inactive",currentRoomId:null}`.

## 7. Assignments

Source: [assignments.js](../server/routes/assignments.js).

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/assignments` | Paginated filtered list with room/camp and optional occupantDetails |
| GET | `/api/assignments/:id` | Populated assignment; detail handler does not add occupantDetails |
| POST | `/api/assignments` | Create active assignment and occupy room |
| PUT | `/api/assignments/:id` | Update checkOutTime/status, with completion/cancellation effects |
| DELETE | `/api/assignments/:id` | Soft cancellation, checkout timestamp, room-release attempt |

### List parameters

| Parameter | Meaning |
| --- | --- |
| roomId, occupantId | Exact ID filters |
| status | active/completed/cancelled |
| page, limit | Defaults 1 and 10 |
| expectedCheckoutFrom | Inclusive lower date bound |
| expectedCheckoutTo | Inclusive upper date bound |
| sortBy | `expectedCheckoutDate` sorts ascending, then `_id`; otherwise createdAt descending |

Invalid date filters or reversed ranges return 400 before querying. The dashboard uses active status and today through the end of the second following calendar date, limited to six results. Occupant details are fetched per record only for Employee assignments; Temporary Visitor returns null.

### Creation / check-in

```json
{
  "roomId": "<room-id>",
  "occupantId": "<employee-id>",
  "occupantType": "Employee",
  "startDate": "2026-10-11",
  "expectedCheckoutDate": "2026-10-18"
}
```

All five fields are required by the handler. Room must exist, have status available, and have no active assignment. Employee occupant must exist; Temporary Visitor existence is not checked. A capacity greater than one does not permit a second active assignment.

Write order for Employee: save currentRoomId → append/save history → save assignment with active status and checkInTime now → save room occupied. Temporary Visitor skips employee writes. No transaction wraps these operations. It does not reject an employee already assigned elsewhere, inactive employees, or reversed dates; the primary UI validates date ordering.

Response: populated assignment plus occupantDetails for Employee or null for Temporary Visitor. A future startDate still occupies the room immediately; there is no scheduling worker.

### Checkout and cancellation

```json
{
  "status": "completed",
  "checkOutTime": "2026-10-18T08:00:00.000Z"
}
```

PUT reads only status/checkOutTime. If completed or cancelled, it changes occupied → available; maintenance/cleaning remain unchanged. It attempts to clear a matching employee currentRoomId and close embedded history before saving the assignment. The comparison uses populated roomId incorrectly in some paths; do not assume employee cleanup succeeded without verification.

DELETE records cancelled plus current checkout time and follows similar release/cleanup logic. Response is `{message:"Assignment cancelled successfully"}`. PUT does not enforce a transition graph: setting active does not reoccupy the room or reconstruct history. A repeated completion/cancellation can affect room state later used by another assignment. Treat checkout as a lifecycle operation, not arbitrary field editing.

## 8. Facilities and users

Sources: [facilities.js](../server/routes/facilities.js), [users.js](../server/routes/users.js).

| Method | Path | Contract |
| --- | --- | --- |
| GET | `/api/facilities` | Optional campId/kind; array, populated camp; kind/name ordering |
| GET | `/api/facilities/:id` | Single facility with camp |
| POST | `/api/facilities` | campId, kind, name; optional capacity, description, openingHours, status |
| PATCH | `/api/facilities/:id` | kind, name, capacity, description, openingHours, status |
| DELETE | `/api/facilities/:id` | Hard delete |
| GET | `/api/users` | Array, excluding password and `__v`; no implemented admin check |

Facility kind/status enumerations are in the [data model](TECHNICAL.md#5-data-model). Create checks the camp. Other user methods may hit generic routes; they do not constitute a dedicated user-management contract. Generic user detail can return fields excluded by the dedicated list.

## 9. AI service

Source: [chat.js](../mcp-server/routes/chat.js).

| Method | Path | Contract |
| --- | --- | --- |
| POST | `/mcp/chat` | `{message,sessionId?,authToken?}` |
| GET | `/mcp/chat/session/:sessionId` | `{success:true,sessionId,messages:[{role,content,timestamp}]}`; history defaults to last 10 |
| DELETE | `/mcp/chat/session/:sessionId` | Clears process-local session; success/message response |
| GET | `/mcp/health` | success, status, timestamp, service, version; no dependency checks |

Successful chat response:

```json
{
  "success": true,
  "message": "<formatted response>",
  "metadata": {
    "intent": "get_rooms",
    "confidence": 0.95,
    "sessionId": "session_example_001",
    "apiDuration": 30,
    "totalDuration": 950
  }
}
```

Metadata/timing fields are branch-dependent. Missing/nonstring or empty-after-cleanup message returns 400. Many model/backend/orchestration errors return **HTTP 200 with success false**, so inspect the body. Unknown/low-confidence intents return success true with clarification text.

Session IDs allow letters, digits, hyphens, underscores. Invalid/missing chat session ID is replaced; invalid history/delete session ID returns 400. These IDs are not authenticated identities. See [AI flow](FLOWS.md#10-ai-chat-flow) for branching and persistence.

## 10. Generic and legacy routes

[server/server.js](../server/server.js) registers generic routes after dedicated routers. Model map: camps, rooms, users, employees, assignments, locations, buildings, facilities.

| Generic route | Declared behavior | Actual compatibility limitation |
| --- | --- | --- |
| GET `/api/:collection` | filter/sort JSON, pagination envelope | Known collection list routes intercept first, with different filters/shapes |
| GET `/api/:collection/:id` | Lean model document | Dedicated detail handlers normally intercept; users fall through |
| POST `/api/:collection` | Model create | Dedicated creation normally intercepts; users fall through but explicit generic guard rejects users POST |
| PUT `/api/:collection/:id` | findByIdAndUpdate with validators | Most dedicated routers use PATCH, so PUT bypasses hierarchy/business helpers; assignments intercept PUT |
| PATCH `/api/:collection/:id` | Same generic query update | Dedicated handlers intercept except unimplemented methods such as assignment/user PATCH |
| DELETE `/api/:collection/:id` | Hard delete | Dedicated handlers intercept; users can reach generic hard delete |
| GET `/api/:collection/count` | Count using JSON filter | Often intercepted as `:id`; otherwise references undefined createGenericSchema |
| DELETE `/api/:collection` | deleteMany with body filter | Undefined createGenericSchema causes failure |
| POST `/api/:collection/aggregate` | Execute body pipeline | Undefined createGenericSchema causes failure |

`runValidators` checks schema fields but does not replace cross-document hierarchy checks or save middleware. A generic user password update bypasses hashing. Generic user reads may expose password hashes. These are implementation gaps, not recommended integration endpoints.

The separate `server/index.js` has `/api/health`, test-users code referencing an unimported User, automatic seed behavior, and static serving aimed at a different output directory. Do not use its contract as the active server contract.

## 11. Error and integration guidance

| Condition | Typical status | Notes |
| --- | --- | --- |
| Missing hierarchy fields / invalid floor | 400 | message response |
| Missing parent/document | 404 | Some nested lists simply return empty arrays |
| Duplicate hierarchy index | 409 | Dedicated hierarchy wrapper |
| Duplicate employee identifier | 400 | Employee-specific validation |
| Occupied/maintenance/cleaning room assignment | 400 | Room not assignable |
| Invalid assignment date query | 400 | Checked before MongoDB query |
| Invalid employee/assignment ID | Often 500 | These loaders do not use hierarchy wrapper |
| Unexpected database/server error | 500 | Error key varies |
| AI downstream error | Often 200 / success false | Do not use HTTP status alone |

Clients should normalize ObjectId versus populated reference objects, honor endpoint-specific response shapes, and distinguish empty lists from failed requests. For checkout, refresh assignment, room, and employee state; local success alone cannot prove all related writes completed consistently.
