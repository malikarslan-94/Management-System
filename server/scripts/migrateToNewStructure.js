/**
 * Production migration: flat Camp.location strings → Location → Camp → Building → Room
 *
 * SAFETY RULES:
 *  1. ALWAYS run against a BACKUP first. Point MONGODB_URI at your backup,
 *     run, verify counts, only then run on the real prod DB.
 *  2. This script is IDEMPOTENT — it skips documents that already have
 *     locationId / buildingId / status set, so re-running is safe.
 *  3. Pass --dry-run to see what would happen without writing anything.
 *
 * It must run to completion with zero blockers BEFORE the hardened schema
 * constraints (Camp.locationId required, Room.buildingId required, the
 * compound unique indexes) are deployed — otherwise existing documents
 * become unsaveable and index builds fail.
 *
 * Usage:
 *   MONGODB_URI=<your-backup-uri> node server/scripts/migrateToNewStructure.js --dry-run
 *   MONGODB_URI=<your-backup-uri> node server/scripts/migrateToNewStructure.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const mongoose = require('mongoose')

const DRY_RUN = process.argv.includes('--dry-run')

const uri = process.env.MONGODB_URI
if (!uri) {
    console.error('ERROR: MONGODB_URI is not set. Aborting.')
    process.exit(1)
}

// Load models
const Location = require('../models/Location')
const Camp = require('../models/Camp')
const Building = require('../models/Building')
const Room = require('../models/Room')

const UNASSIGNED_LOCATION = 'Unassigned'
const DEFAULT_BUILDING = 'Main Block'

// Blockers = data that would violate the hardened schema. Collected, not thrown,
// so one run reports every problem instead of stopping at the first.
const blockers = []

async function migrate() {
    await mongoose.connect(uri, { dbName: process.env.DB_NAME })
    console.log('Connected to DB:', mongoose.connection.name)
    if (DRY_RUN) console.log('*** DRY RUN — no writes will be made ***\n')

    // ─── Step 1: location strings → Location documents ───────────────────────
    console.log('Step 1: Migrating Camp.location strings → Location documents...')

    const camps = await Camp.find({})
    const distinctStrings = [...new Set(camps.map((c) => (c.location || '').trim()).filter(Boolean))]

    // Camps with a blank location string still need a home once locationId is
    // required, so they all go under a single "Unassigned" location to be
    // sorted out by hand afterwards.
    const campsWithoutLocation = camps.filter((c) => !(c.location || '').trim() && !c.locationId)
    if (campsWithoutLocation.length > 0) {
        console.log(
            `  ${campsWithoutLocation.length} camp(s) have no location string — they will go under "${UNASSIGNED_LOCATION}"`,
        )
        distinctStrings.push(UNASSIGNED_LOCATION)
    }

    console.log(`  Found ${distinctStrings.length} distinct location name(s):`, distinctStrings)

    const locationMap = {} // "string" → Location._id

    for (const name of distinctStrings) {
        // Case-insensitive lookup: the old UI treated "Dammam" and "dammam" as
        // one location, so collapse them into one document here too.
        let loc = await Location.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') })
        if (!loc) {
            if (!DRY_RUN) {
                loc = await Location.create({ name, status: 'active' })
                console.log(`  Created Location: "${name}" (_id: ${loc._id})`)
            } else {
                console.log(`  [DRY] Would create Location: "${name}"`)
                loc = { _id: new mongoose.Types.ObjectId() }
            }
        } else {
            console.log(`  Location already exists: "${loc.name}" (_id: ${loc._id})`)
        }
        locationMap[name.toLowerCase()] = loc._id
    }

    // ─── Step 2: Set Camp.locationId from the map ─────────────────────────────
    console.log('\nStep 2: Setting Camp.locationId...')
    let campsMigrated = 0
    let campsSkipped = 0

    for (const camp of camps) {
        if (camp.locationId) {
            campsSkipped++
            continue
        }
        const locName = (camp.location || '').trim() || UNASSIGNED_LOCATION
        const locId = locationMap[locName.toLowerCase()]
        if (!locId) {
            blockers.push(`Camp "${camp.name}" (${camp._id}) has no resolvable location ("${camp.location}")`)
            continue
        }
        if (!DRY_RUN) {
            await Camp.findByIdAndUpdate(camp._id, { locationId: locId })
        }
        console.log(`  [${DRY_RUN ? 'DRY' : 'OK'}] Camp "${camp.name}" → locationId: ${locId}`)
        campsMigrated++
    }
    console.log(`  Migrated: ${campsMigrated}, Skipped (already had locationId): ${campsSkipped}`)

    // ─── Step 2b: Camp name collisions within a location ─────────────────────
    // { locationId, name } is about to become a unique index.
    console.log('\nStep 2b: Checking camp name uniqueness per location...')
    const campDupes = await Camp.aggregate([
        { $group: { _id: { locationId: '$locationId', name: '$name' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } },
    ])
    for (const d of campDupes) {
        blockers.push(
            `${d.count} camps named "${d._id.name}" under location ${d._id.locationId} — rename all but one (ids: ${d.ids.join(', ')})`,
        )
    }
    console.log(`  ${campDupes.length === 0 ? 'OK — no duplicates' : `${campDupes.length} collision group(s) found`}`)

    // ─── Step 3: Create one default Building per camp (for existing rooms) ────
    console.log('\nStep 3: Creating default Building per camp...')
    const buildingMap = {} // campId.toString() → Building._id

    const allCamps = await Camp.find({})
    for (const camp of allCamps) {
        // Only camps that actually have building-less rooms need a default block.
        const orphanRooms = await Room.countDocuments({ camp: camp._id, buildingId: null })
        const existingBuildings = await Building.countDocuments({ campId: camp._id })

        if (orphanRooms === 0 && existingBuildings > 0) {
            console.log(`  Camp "${camp.name}" already has ${existingBuildings} building(s) and no orphan rooms — skipping`)
            continue
        }

        let building = await Building.findOne({ campId: camp._id, name: DEFAULT_BUILDING })
        if (!building) {
            if (!DRY_RUN) {
                building = await Building.create({
                    campId: camp._id,
                    name: DEFAULT_BUILDING,
                    type: 'residential',
                    floors: await maxFloorForCamp(camp._id),
                    status: 'active',
                })
                console.log(`  Created Building "${DEFAULT_BUILDING}" for camp "${camp.name}" (_id: ${building._id})`)
            } else {
                console.log(`  [DRY] Would create Building "${DEFAULT_BUILDING}" for camp "${camp.name}"`)
                building = { _id: new mongoose.Types.ObjectId() }
            }
        } else {
            console.log(`  Building "${DEFAULT_BUILDING}" already exists for camp "${camp.name}"`)
        }
        buildingMap[camp._id.toString()] = building._id
    }

    // ─── Step 4: Set Room.buildingId ─────────────────────────────────────────
    console.log('\nStep 4: Setting Room.buildingId...')
    const rooms = await Room.find({})
    let roomsMigrated = 0
    let roomsSkipped = 0

    for (const room of rooms) {
        if (room.buildingId) {
            roomsSkipped++
            continue
        }
        const campKey = room.camp?.toString()
        const buildingId = buildingMap[campKey]
        if (!buildingId) {
            blockers.push(`Room "${room.roomNumber}" (${room._id}) has no building and no default block for camp ${campKey}`)
            continue
        }
        if (!DRY_RUN) {
            await Room.findByIdAndUpdate(room._id, { buildingId })
        }
        console.log(`  [${DRY_RUN ? 'DRY' : 'OK'}] Room "${room.roomNumber}" → buildingId: ${buildingId}`)
        roomsMigrated++
    }
    console.log(`  Migrated: ${roomsMigrated}, Skipped (already had buildingId): ${roomsSkipped}`)

    // ─── Step 5: Room number collisions within a building ────────────────────
    // { buildingId, roomNumber } is about to become a unique index. Duplicates
    // are renamed rather than reported, because auto-generated legacy data
    // routinely repeats numbers and hand-fixing is impractical.
    console.log('\nStep 5: Resolving duplicate room numbers per building...')
    const roomDupes = await Room.aggregate([
        { $match: { buildingId: { $ne: null } } },
        { $group: { _id: { buildingId: '$buildingId', roomNumber: '$roomNumber' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } },
    ])

    let renamed = 0
    for (const d of roomDupes) {
        // Keep the first, suffix the rest: 101, 101-2, 101-3 …
        const [, ...rest] = d.ids
        for (let i = 0; i < rest.length; i++) {
            const newNumber = await nextFreeRoomNumber(d._id.buildingId, d._id.roomNumber, i + 2)
            if (!DRY_RUN) {
                await Room.findByIdAndUpdate(rest[i], { roomNumber: newNumber })
            }
            console.log(`  [${DRY_RUN ? 'DRY' : 'OK'}] Room ${rest[i]}: "${d._id.roomNumber}" → "${newNumber}"`)
            renamed++
        }
    }
    console.log(`  Renamed ${renamed} duplicate room number(s) across ${roomDupes.length} collision group(s)`)

    // ─── Step 6: isAvailable (boolean) → status (enum) ───────────────────────
    // A boolean cannot express maintenance/cleaning, which is why the frontend
    // invented its own status field. Backfill the real one.
    console.log('\nStep 6: Migrating Room.isAvailable → Room.status...')
    // Read through the raw collection, not the model: `isAvailable` is now a
    // virtual derived from `status`, so the model would report it as false for
    // every legacy document (which has no status yet) and mark them all occupied.
    const needsStatus = await Room.collection.find({ status: { $exists: false } }).toArray()
    for (const room of needsStatus) {
        const status = room.isAvailable === false ? 'occupied' : 'available'
        if (!DRY_RUN) {
            await Room.collection.updateOne({ _id: room._id }, { $set: { status }, $unset: { isAvailable: '' } })
        }
        console.log(`  [${DRY_RUN ? 'DRY' : 'OK'}] Room "${room.roomNumber}" → status: ${status}`)
    }
    console.log(`  Set status on ${needsStatus.length} room(s)`)

    // ─── Step 7: Floors must cover the rooms that reference them ─────────────
    console.log('\nStep 7: Checking floor bounds against building.floors...')
    const buildings = await Building.find({})
    let floorsRaised = 0
    for (const b of buildings) {
        const [top] = await Room.find({ buildingId: b._id }).sort({ floor: -1 }).limit(1).select('floor')
        if (top && top.floor > b.floors) {
            if (!DRY_RUN) {
                await Building.findByIdAndUpdate(b._id, { floors: top.floor })
            }
            console.log(`  [${DRY_RUN ? 'DRY' : 'OK'}] Building "${b.name}": floors ${b.floors} → ${top.floor} (has a room on floor ${top.floor})`)
            floorsRaised++
        }
    }
    console.log(`  Raised floor count on ${floorsRaised} building(s)`)

    // ─── Summary ──────────────────────────────────────────────────────────────
    console.log('\n' + (DRY_RUN ? '=== DRY RUN COMPLETE ===' : '=== MIGRATION COMPLETE ==='))
    console.log('Final DB state:')
    console.log('  Locations:', await Location.countDocuments())
    console.log('  Camps:', await Camp.countDocuments())
    console.log('  Camps missing locationId:', await Camp.countDocuments({ locationId: null }))
    console.log('  Buildings:', await Building.countDocuments())
    console.log('  Rooms:', await Room.countDocuments())
    console.log('  Rooms missing buildingId:', await Room.countDocuments({ buildingId: null }))

    if (blockers.length > 0) {
        console.error(`\n❌ ${blockers.length} BLOCKER(S) — fix these before deploying the hardened schema:`)
        blockers.forEach((b) => console.error('  •', b))
        await mongoose.disconnect()
        process.exit(1)
    }

    console.log('\n✅ No blockers. Safe to deploy the hardened schema.')
    if (!DRY_RUN) {
        console.log('\nNext steps:')
        console.log('  1. Verify the data looks correct.')
        console.log('  2. Restart the server so the new indexes build.')
        console.log('  3. Re-home any camps parked under "Unassigned".')
    }

    await mongoose.disconnect()
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Highest floor referenced by a camp's rooms, so a default block is tall enough. */
async function maxFloorForCamp(campId) {
    const [top] = await Room.find({ camp: campId }).sort({ floor: -1 }).limit(1).select('floor')
    return Math.max(1, top?.floor || 1)
}

/** First "<base>-<n>" that no room in this building is using. */
async function nextFreeRoomNumber(buildingId, base, startAt) {
    let n = startAt
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const candidate = `${base}-${n}`
        const taken = await Room.exists({ buildingId, roomNumber: candidate })
        if (!taken) return candidate
        n++
    }
}

migrate().catch((err) => {
    console.error('Migration failed:', err)
    mongoose.disconnect()
    process.exit(1)
})
