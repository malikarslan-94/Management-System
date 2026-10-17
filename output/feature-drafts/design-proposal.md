# CampWise remaining sidebar features — design draft
Date: 16 October 2026
Status: For design approval. No application frontend or backend has been implemented in this task.

This proposal covers the four entries currently disabled in the navigation configuration: Check-In / Check-Out, Recreation Facilities, Reports, and Settings & Roles. Desktop is the primary draft format because these are existing sidebar entries. Responsive behavior is specified below.

## Review files
- [Check-In / Check-Out](01-check-in-out.png)
- [Facilities](02-facilities.png)
- [Reports](03-reports.png)
- [Settings & Roles](04-settings-roles.png)

Images illustrate layout and sample records. The rules below define the proposed behavior; sample totals are not product performance claims.

## Shared appearance and interaction
Keep the existing CampWise shell: green brand and active sidebar, white cards, light gray background, navy headings, blue primary actions, Inter-style typography, and the purple AI launcher. Each page uses a title, one main action, filters, and a focused content area. Labels remain visible above fields. Statuses use both words and colors.

Use side drawers for creation and review on desktop; open a full-screen form on narrow screens. Keep filters when returning from a detail panel. Show inline validation next to the affected field, preserve entered values after a failed save, and prevent repeated submission while saving. Show success only after the server confirms the change. Loading, empty results, connection errors, and permission denial must have distinct presentations.

Suggested new routes: /check-in-out, /facilities, /reports, /settings-roles. These are proposals only. Existing routes and navigation stay unchanged until implementation is approved.

## 1. Check-In / Check-Out
### Purpose and boundary
Give reception staff a daily operations view. It uses the SAME room assignment records as Room Assignments: no second resident-stay database and no separate checkout logic. Room Assignments remains the complete assignment register; this screen focuses on today's work.

The current backend allocates a whole room to one active assignment. Version 1 keeps that rule. Individual bed allocation, group occupancy, and scheduled reservations require separate design and are not implied by this screen.

### Main screen
- Four summary cards: Checked in today, Due today, Overdue, Checked out today.
- Camp filter, reference date defaulting to today, and search by resident or room.
- Tabs: Due & overdue, Checked in, History.
- Table: resident/name and employee ID, camp/building/room, expected checkout, status, primary action.
- New check-in button opens a three-step form: Resident → Room → Review.
- Selecting a row opens its stay details, dates, and recorded actions.

Metric definitions: Checked in today uses actual check-in timestamps within the selected local day; Due today counts active assignments expected that day; Overdue counts active assignments expected before that day; Checked out today uses actual completed checkout timestamps. All cards use the same authorized camp scope. The Due & overdue queue includes both groups; its result count is their combined count.

### New check-in
1. Find an existing active employee or visitor. Offer an Add resident link only if the operator can create records.
2. Choose camp, building, floor, and an available room. Show room type and capacity as metadata, without suggesting multiple active assignments.
3. Enter expected checkout and optional operational notes. Check-in time defaults to the current server-confirmed time.
4. Review the resident, accommodation, and dates; then Confirm check-in.
5. On success, refresh room availability, the employee's current stay, assignment history, and related dashboard/report views.

Both employee and visitor records must follow the same occupancy/history rules. Reject an existing active stay for the resident, an unavailable room, an invalid date sequence, or a room outside the user's permitted camps.

### Check-out
Open a review drawer with resident, camp/building/room, check-in, expected checkout, current checkout time, and notes. Let the operator choose the resulting room state: Available or Cleaning. Proposed default: Cleaning. Display: “The room becomes assignable when cleaning is complete.”

Confirming completes the existing assignment, clears the matching resident room reference, closes the stay history, records actor/time, and applies the selected room state as one consistent operation. A room already blocked for maintenance stays blocked; the form must explain that state rather than let checkout silently remove it. Marking cleaning complete happens through an authorized room-status action.

A previously completed or cancelled stay cannot be checked out again. If another operator changes the room/stay while this screen is open, refresh its details and explain the conflict.

### Secondary states
- Empty queue: “No check-outs due for this date.”
- Search with no matches: “No matching residents or rooms. Adjust your filters.”
- Conflict: “This stay has changed. Review the latest details before continuing.”
- Failed request: preserve the review form; do not imply checkout completed.

### Implementation implications, after approval
Reuse the current assignment/room/employee models, but consolidate assignment and profile update paths. Add checkout notes/resulting room state as needed, actor/timestamp history, camp/date filters, server validation, concurrency protection and consistent multi-record updates. The current checkout always releasing an occupied room is not sufficient for the proposed Cleaning choice.

Defer bulk checkout, future arrivals/reservations, bed-level allocation, and biometric/QR access.

## 2. Facilities
### Recommended name
Rename Recreation Facilities to Facilities. Existing facility types include prayer spaces, dining, laundry and medical areas as well as recreation, so the broader label describes the data accurately.

### Main screen
- Summary: Total, Active, Maintenance, Inactive.
- Camp, facility type, status and text filters.
- Card/list switch, with cards as the initial view.
- Each card shows icon, name, camp, type, capacity with its unit, opening hours, status and View details.
- Add facility opens a side drawer.

Supported types follow the existing model: Mosque, Mess / Dining, Playing area, Recreation center, Medical, Laundry, Parking and Other. A gym can initially be a named Recreation center rather than a new backend type.

### Add and edit form
Camp, type, facility name, optional capacity, opening hours, description, status. Camp is required on creation and read-only on edit, matching the current ownership rule. Require a name/type and valid nonnegative capacity. Render an unspecified capacity as “Not set”; do not confuse it with current attendance. Use people for person-capacity facilities and spaces for parking; confirm capacity meaning in the form.

The detail drawer contains Overview, editable fields for permitted users, and actions Edit, Mark maintenance, Reactivate or Deactivate. Prefer deactivation to deleting an operational record. Marking a facility as Maintenance changes its availability status; it does not claim that a repair work order was created.

### States and behavior
Facilities remain separate from rooms and never enter room occupancy totals. Only Active facilities appear in a default operational list; users can explicitly include other statuses. Deactivation or maintenance requires a confirmation explaining the change. A missing camp or stale facility produces a clear refresh message.

Empty state: “No facilities added to this camp yet.” Show Add facility only to authorized users. A viewer can inspect details but cannot change status.

### Existing foundation and new work
A CampFacility model, CRUD API, frontend service and hook already exist. The main page and permission-aware workflow are missing. Extend server filtering/pagination, validation, authorization and activity recording as needed rather than introducing a duplicate facility model.

Defer reservations, booking calendars, occupancy sensors, utilization percentages, attendance tracking and facility billing. Maintenance work orders require the separate persistent maintenance module; the current local request summaries are not a shared ticket system.

## 3. Reports
### Purpose and main layout
A report workspace with four report tabs, report-specific filters, Generate report, a readable preview, Export CSV, and Print / PDF using a print-friendly layout. A generated preview displays the timestamp, timezone, filters and authorized camp scope. Export must represent that preview's dataset; if data is refreshed, refresh the preview and its timestamp together.

### First release reports
| Report | Filters | Preview/output |
| --- | --- | --- |
| Current room occupancy | Location, camp, building; current snapshot | Total, occupied, available, maintenance/cleaning rooms; occupancy percentage; breakdown by camp/building |
| Resident roster | Camp, department, resident type, active status | Employee ID, name, department, current camp/room and expected checkout |
| Check-in / Check-out | Camp, event type, date range, resident search | Resident, room, event, actual timestamp, expected checkout and status |
| Facilities register | Camp, type, status | Facility, camp, type, capacity/unit, opening hours, status |

Current occupancy is an as-of snapshot. Do not give it a historical date-range chart until there is an appropriate historical data source. Check-in/out reports can use actual recorded event times; expected checkout is not proof of an actual departure.

Room occupancy = occupied rooms / total rooms, with 0% for an empty inventory. Available is only status available. Unavailable includes maintenance and cleaning. All aggregates use the complete filtered dataset, not just the loaded table page. Resident counts are distinct from occupied-room counts.

### Data and export behavior
The report example shows 240 rooms = 192 occupied + 36 available + 12 unavailable; occupancy is 80%. These are illustrative sample records. Keep preview totals, table footer and exported totals consistent.

Do not include full identity documents or Iqama numbers in the default roster export. Add sensitive columns only through an explicit permission and selection. CSV export uses the same access restrictions as the visible report; the print layout includes the company title, report name, scope, generated timestamp and page breaks.

Empty result: “No records match these filters.” A loading failure must show an error with Retry, not zero statistics. Disable export until a preview is successfully generated.

### Implementation implications
Add report aggregation/export endpoints, authorized camp filtering, shared metric definitions and a print template. Current room/assignment/employee/facility data can support the initial reports after relationship consistency is addressed.

Defer scheduled email reports, historical occupancy trends, financial/revenue reports and shared maintenance/inventory reports. Maintenance records are currently browser-local and inventory has no persistent stock model, so neither is a reliable company-wide reporting source yet.

## 4. Settings & Roles
### Main layout
Three tabs: Users, Roles, Preferences.
- Users: search, role/camp/status filters, user table and Add user.
- Roles: four fixed role templates with a readable permission matrix. This is read-only in version 1.
- Preferences: organization display name/logo, operational timezone and date-display format. Initial design remains English; a complete Arabic translation is separate scope.

User editor: name, email, role, assigned camps and account status. Account credentials must never be displayed in the table or drawer. Proposed user creation uses an administrator-created account with a one-time credential that requires change at first login; secure delivery, forced change and recovery must be implemented as part of account creation before it is enabled. Do not show “Invitation sent” without an actual invitation service.

### Proposed version 1 access
| Action | Administrator | Camp Manager | Reception | Viewer |
| --- | --- | --- | --- | --- |
| View authorized camps/rooms/residents | All camps | Assigned camps | Assigned camps | Assigned camps |
| Edit operational room/resident records | Yes | Assigned camps | Resident records only | No |
| Check in / Check out | Yes | Assigned camps | Assigned camps | No |
| Manage facilities | Yes | Assigned camps | No | No |
| View operational reports | Yes | Assigned camps | Assigned camps | Assigned camps |
| Export reports | Yes | Assigned camps | No | No |
| Manage user accounts and roles | Yes | No | No | No |
| Organization preferences | Yes | No | No | No |

Reception cannot create or restructure camps/buildings/rooms; it can register residents and operate stays within assigned camps. Defining camp/building structure is restricted to Administrator in the initial scope unless expanded during approval.

Camp permissions belong to each user's assignment of camps, not to the role's name. An operational user with no assigned camps sees a clear “No camps assigned” state and has no operational data access. Users cannot grant themselves additional access.

The role matrix clarifies what a role can do; the user drawer determines where that person can do it. Keep the Administrator template fixed. Custom permission builders and custom roles are deferred.

### Access changes and activity
Changing a role, assigned camps or active status shows a concise review before saving. Deactivating a login account preserves its activity history. Prevent removal/deactivation of the last active administrator. Record who changed access, the time and the old/new values. Apply changes to subsequent authorized requests and revoke access for deactivated users.

### Existing foundation and new work
The current User schema has user/admin roles only. Authentication middleware exists but is not attached to the active data routes. A Settings & Roles interface therefore requires real authorization behind every relevant API, including generic collection routes, exports and AI-triggered requests; hiding a menu is not permission enforcement.

Review existing accounts before migrating legacy roles. Introduce the agreed roles, assigned camps, account state, account lifecycle, access-change history and a consistent authenticated request identity. Ensure the AI service uses the same user's permissions. The implementation release order must establish these controls before exposing role-sensitive features.

## Responsive behavior
At tablet/mobile sizes, use the existing collapsed navigation, stacked summaries and a filter sheet. Convert operational table rows to cards with the same key fields and primary action. Drawers become full-screen forms with a visible back button and fixed action footer. Report tables may scroll horizontally with the camp/name column retained; downloads use the same filters and permissions. Roles become a stacked permission list, not a compressed matrix. This task's images are desktop drafts, not implemented responsive screens.

## Decisions included in this draft
1. Rename Recreation Facilities to Facilities.
2. Use room-level allocation and the existing assignment lifecycle.
3. Default a checked-out room to Cleaning, with an explicit Available option for ready rooms.
4. Ship four grounded reports; no historical occupancy, finance or company-wide maintenance analytics initially.
5. Start with four fixed roles and user-specific camp access.
6. Keep facility bookings, custom roles and automated email exports for a later phase.

## Proposed implementation order after approval
1. Authenticated identity, role/camp authorization, access lifecycle and shared audit conventions.
2. Reliable assignment/check-in/out transitions and the new daily operations view.
3. Facilities page using the existing facility model/API.
4. Reports using consistent, access-filtered source data.
5. Integrated validation of permissions, concurrent check-ins, duplicate checkouts, facility state changes, report totals/exports and narrow-screen flows.

Approval of a visual layout does not mean existing backend gaps have already been fixed. The implementation should be separately authorized as requested.

