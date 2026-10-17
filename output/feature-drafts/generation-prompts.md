# CampWise sidebar feature design prompts

Mode: Built-in image generation. First screen generated from the inspected project theme; subsequent screens use it as a visual reference. Files are design drafts with sample data.

## 01-check-in-out-initial

Use case: ui-mockup.
Asset type: A polished desktop application design draft screenshot for CampWise, not a mobile screen.
Create ONE sharp flat desktop SaaS screen, landscape 16:10 aspect ratio, ideally 1920x1200. No device frame, no browser chrome, no photography, no presentation title outside the interface. Match the real CampWise theme: pale #f7f8fb background, white surfaces, subtle #e5e9f0 borders, navy #172033 headings, blue-gray #526079 secondary text, blue #326bfa primary buttons, green #219653 brand and selected sidebar, purple only for floating AI. Inter-style sans-serif, 12px logical corner radius, thin consistent outline icons, ample precise spacing. Keep text legible with an uncluttered enterprise layout.

APP SHELL: fixed left sidebar about 245px of a 1600px logical viewport. At top CampWise brand: small green circular tent/campfire line symbol, wordmark Camp in navy and Wise green. A small heading "MANAGEMENT". Sidebar items in EXACT order:
"Dashboard"
"Locations & Camps"
"Room Management"
"Employee Management"
"Room Assignments"
"Inventory & maintenance"
"Check-In / Check-Out"
"Facilities"
"Reports"
Bottom-pinned "ADMINISTRATION" heading then "Admin Panel" and "Settings & Roles".
Highlight "Check-In / Check-Out" with pale green rounded background and green left accent. All other menu labels normal readable gray, not blurred.
Main top header white, left small hamburger icon; right small "EN", bell, and avatar "SA". Main page right of sidebar has modest "Design draft · Sample data" badge in header.

MAIN SCREEN: title "Check-In / Check-Out"; subtitle "Manage daily arrivals and departures." Top-right primary blue "+ New check-in".
Four compact white KPI cards "Checked in today 12", "Due today 8", "Overdue 3", "Checked out today 5".
Below a toolbar with "All camps" dropdown, "Today" date picker, search "Search resident or room".
Tab strip "Due check-outs" active blue underline, "Checked in", "History".
A white data table occupying the main area, large enough for crisp readable text. Columns "Resident", "Camp / Room", "Expected checkout", "Status", "Action". 4 rows:
"Faisal Ahmed" / "Horizon · H-104" / "16 Oct 2026" / amber "Due today" / outlined "Check out"
"Omar Ali" / "Horizon · H-108" / "16 Oct 2026" / amber "Due today" / outlined "Check out"
"Imran Shah" / "North · N-202" / "15 Oct 2026" / red "Overdue" / outlined "Check out"
"Bilal Noor" / "East · E-110" / "16 Oct 2026" / amber "Due today" / outlined "Check out".
Small table footer "Showing 4 of 8" and minimal pagination. Dates are illustrative.

Show a right-side checkout detail drawer open, approximately 360 logical pixels wide, beside or over the table but never obscure needed copy. Keep main area undimmed or very lightly dimmed. Drawer header "Review check-out" with close X. Resident card "Faisal Ahmed", secondary "EMP-0182". Details "Horizon Camp", "Building A · H-104", "Check-in: 01 Oct 2026". Field "Check-out date" value "16 Oct 2026". Field "Room after check-out" segmented choices "Available" and "Cleaning", Cleaning selected. Short helper text "The room becomes assignable when cleaning is complete." Optional notes field "Notes". Bottom buttons "Cancel" and filled blue "Confirm check-out". No success toast: this is before confirmation.
Small purple circular sparkle AI launcher anchored bottom-right, away from buttons.
A coherent premium but practical desktop design, visually aligned with the existing CampWise web application. Avoid duplicate navs, bed-level allocation, dollar figures, invented analytics, unreadable microtext.

## 01-check-in-out

Use case: ui-mockup. Edit the supplied CampWise desktop checkout screenshot with ONLY TWO text corrections. Change active tab "Due check-outs" to "Due & overdue". Change footer "Showing 4 of 8" to "Showing 4 of 11". Preserve every other pixel/layout element, metric, sidebar, logo, table row, action and checkout drawer. Keep same image size. These corrections make the queue consistent with eight due today plus three overdue. Do not add any new interface elements.

## 02-facilities

Use case: ui-mockup.
Asset type: A high-fidelity desktop CampWise feature design draft.
Use the supplied desktop screenshot as the VISUAL STYLE REFERENCE, not a request to reproduce its current page. Create one DIFFERENT screen of the same app. Keep exactly the same landscape aspect ratio, canvas size, 245px-style left sidebar, top bar, logo, typeface, spacing, navy headings, white cards, pale gray background, green sidebar highlight, cobalt blue primary buttons, subtle borders, and small purple AI launcher. Maintain readable enterprise UI. No phone, no physical screen, no browser chrome, no perspective, no added exterior presentation labels.
Sidebar text EXACTLY: Dashboard; Locations & Camps; Room Management; Employee Management; Room Assignments; Inventory & maintenance; Check-In / Check-Out; Facilities; Reports. Bottom ADMINISTRATION: Admin Panel; Settings & Roles. Only current page selected in pale green. Header badge "Design draft · Sample data", right EN, bell, SA avatar. Logo CampWise with green tent and navy/green wordmark. All data fictional. Do not replicate old checkout content. All requested copy must be sharp and readable. No invented badges, no fake certifications, no gibberish or generic lorem ipsum.

SCREEN: Facilities. Highlight Facilities in sidebar.
Main heading "Facilities", subtitle "Manage shared spaces across your camps." Primary top-right button "+ Add facility".
Four summary cards "Total 12", "Active 9", "Maintenance 2", "Inactive 1".
Filters "All camps", "All types", "All statuses", search "Search facilities".
Six white facility cards in a 2-column by 3-row grid, each with a thin colored line icon, name, camp, details, status pill, small "View details" link. Keep large text and spare composition:
"Central Mosque", "Horizon Camp", "Capacity: 150", green "Active".
"Dining Hall", "Horizon Camp", "Capacity: 120", green "Active".
"Recreation Center", "North Camp", "Capacity: 40", green "Active".
"Laundry", "Horizon Camp", "Capacity: Not set", amber "Maintenance".
"Medical Clinic", "East Camp", "Capacity: 12", green "Active".
"Parking Area", "North Camp", "Capacity: 30 spaces", gray "Inactive".
Footer "Showing 6 of 12" with pagination.
Open right-side add drawer, width like checkout reference. Header "Add facility", close X. Labeled inputs "Camp" value "Horizon Camp"; "Type" value "Recreation center"; "Facility name" value "Indoor Gym"; "Capacity" value "30"; "Opening hours" value "06:00–22:00"; "Status" value "Active"; optional small "Description" area. Footer buttons "Cancel" and primary "Save facility".
No room allocation, no measured utilization, no reservation calendar, no booking actions. This page manages actual shared-space records, not accommodation rooms.

## 03-reports

Use case: ui-mockup.
Asset type: A high-fidelity desktop CampWise feature design draft.
Use the supplied desktop screenshot as the VISUAL STYLE REFERENCE, not a request to reproduce its current page. Create one DIFFERENT screen of the same app. Keep exactly the same landscape aspect ratio, canvas size, 245px-style left sidebar, top bar, logo, typeface, spacing, navy headings, white cards, pale gray background, green sidebar highlight, cobalt blue primary buttons, subtle borders, and small purple AI launcher. Maintain readable enterprise UI. No phone, no physical screen, no browser chrome, no perspective, no added exterior presentation labels.
Sidebar text EXACTLY: Dashboard; Locations & Camps; Room Management; Employee Management; Room Assignments; Inventory & maintenance; Check-In / Check-Out; Facilities; Reports. Bottom ADMINISTRATION: Admin Panel; Settings & Roles. Only current page selected in pale green. Header badge "Design draft · Sample data", right EN, bell, SA avatar. Logo CampWise with green tent and navy/green wordmark. All data fictional. Do not replicate old checkout content. All requested copy must be sharp and readable. No invented badges, no fake certifications, no gibberish or generic lorem ipsum.

SCREEN: Reports. Highlight Reports in sidebar. Do not show a right side drawer; allow report content to use full main width.
Heading "Reports", subtitle "Preview operational data before exporting." Top right secondary "Print / PDF" and blue "Export CSV".
Horizontal report tabs "Occupancy" selected with blue underline, "Resident roster", "Check-in / Check-out", "Facilities".
A white filter bar with "All locations", "All camps", a small chip "Current snapshot", and blue "Generate report".
Below small caption "As of 16 Oct 2026, 10:30 · Riyadh time".
Four summary cards "Total rooms 240", "Occupied 192", "Available 36", "Unavailable 12".
Middle row: large white occupancy summary card with a blue donut showing "80%" and label "Room occupancy"; legend "Occupied 192", "Available 36", "Unavailable 12" in blue, green, amber. Next to it a white "By camp" card with four horizontal blue occupancy bars labeled "Horizon 80%", "North 80%", "East 83.3%", "West 75%". No time-series graph.
Bottom large white report table titled "Occupancy by camp". Columns "Camp", "Total rooms", "Occupied", "Available", "Unavailable", "Occupancy". EXACT rows:
Horizon | 60 | 48 | 9 | 3 | 80%
North | 80 | 64 | 12 | 4 | 80%
East | 60 | 50 | 7 | 3 | 83.3%
West | 40 | 30 | 8 | 2 | 75%
Bold total footer: Total | 240 | 192 | 36 | 12 | 80%
Subtle note below: "Unavailable includes rooms marked for maintenance or cleaning."
Crisp enterprise reporting screenshot, no revenue, no regulatory compliance scores, no utilization claims, no fabricated historical comparison.

## 04-settings-roles

Use case: ui-mockup.
Asset type: A high-fidelity desktop CampWise feature design draft.
Use the supplied desktop screenshot as the VISUAL STYLE REFERENCE, not a request to reproduce its current page. Create one DIFFERENT screen of the same app. Keep exactly the same landscape aspect ratio, canvas size, 245px-style left sidebar, top bar, logo, typeface, spacing, navy headings, white cards, pale gray background, green sidebar highlight, cobalt blue primary buttons, subtle borders, and small purple AI launcher. Maintain readable enterprise UI. No phone, no physical screen, no browser chrome, no perspective, no added exterior presentation labels.
Sidebar text EXACTLY: Dashboard; Locations & Camps; Room Management; Employee Management; Room Assignments; Inventory & maintenance; Check-In / Check-Out; Facilities; Reports. Bottom ADMINISTRATION: Admin Panel; Settings & Roles. Only current page selected in pale green. Header badge "Design draft · Sample data", right EN, bell, SA avatar. Logo CampWise with green tent and navy/green wordmark. All data fictional. Do not replicate old checkout content. All requested copy must be sharp and readable. No invented badges, no fake certifications, no gibberish or generic lorem ipsum.

SCREEN: Settings & Roles. Highlight Settings & Roles in the bottom sidebar.
Main heading "Settings & Roles"; subtitle "Manage user access and camp permissions." Top primary "+ Add user".
Tabs "Users", "Roles" selected blue underline, "Preferences".
Main content is two white panels: narrow role list on left and wide permission panel in center. Keep open right-side user editor drawer same width as reference.
Role list heading "Role templates", four entries "Administrator", "Camp Manager" selected pale blue, "Reception", "Viewer". Each has a simple outline icon, no performance stats.
Center panel heading "Camp Manager", small muted pill "Role template", subtitle "Operational access to assigned camps."
A clear read-only permission table with columns "Permission" and "Access":
"View camps and rooms" / green check
"Manage resident records" / green check
"Check in and check out" / green check
"Manage facilities" / green check
"View reports" / green check
"Export reports" / green check
"Manage users and roles" / gray dash
Below one concise blue info box "Assign roles and camps from the Users tab." This version uses fixed role templates; no edit-permissions button.
Right drawer title "Edit user access", close X. Avatar initials "SM" and name "Sara Malik". Labeled fields "Name" value "Sara Malik"; "Email" value "sara@example.com"; "Role" dropdown "Camp Manager"; "Assigned camps" multi-select with chips "Horizon Camp" and "North Camp"; "Account status" segmented Active (selected green) / Inactive. Brief helper "This user can access only the selected camps." Footer Cancel and blue "Save access".
No password shown, no credentials, no API keys, no fake compliance claims. Use normal readable mobile-independent desktop controls. Keep balanced spacing and consistent visual design.
