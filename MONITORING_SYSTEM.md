# Client Contact & Job Award Detection System

## Overview
The system now automatically monitors for:
1. **New client messages** - When a client sends you a message
2. **Job awards** - When a client accepts your bid and awards you the job
3. **Real-time notifications** - Dashboard updates via WebSocket

## Architecture

### Backend Components

#### 1. JobMonitor Service (`backend/services/jobMonitor.js`)
Handles all monitoring logic:

**Methods:**
- `checkNewMessages()` - Fetches threads from Freelancer API, detects new messages from clients
- `checkJobAwards()` - Checks if any of your bids were accepted by clients
- `runMonitoringCycle()` - Runs both checks in sequence
- `startAutoMonitoring(intervalMs)` - Starts automatic monitoring on a timer
- `stopAutoMonitoring()` - Stops the monitoring loop

**Key Features:**
- Skips messages from yourself (checks `from_user` against `FREELANCER_USER_ID`)
- Auto-generates draft replies using `generateAutoReply()` from jobAnalyzer
- Updates job status to `ACCEPTED` when bid is awarded
- Broadcasts events via WebSocket to dashboard

#### 2. Monitor Routes (`backend/routes/monitor.js`)
Exposes monitoring functionality via REST API:

```
GET  /api/monitor/status           - Get current monitoring status
POST /api/monitor/check-messages   - Manually check for new messages
POST /api/monitor/check-awards     - Manually check for job awards
POST /api/monitor/run-cycle        - Run full monitoring cycle
POST /api/monitor/start            - Start auto-monitoring
POST /api/monitor/stop             - Stop auto-monitoring
```

#### 3. Server Integration (`backend/server.js`)
- Imports JobMonitor and monitor routes
- Starts auto-monitoring on server startup
- Uses `MONITOR_INTERVAL` env var (default: 120000ms = 2 minutes)

### Frontend Components

#### 1. WebSocket Connection
- Connects to `ws://localhost:3001` (or production equivalent)
- Automatically reconnects if disconnected
- Displays monitoring status (green dot = active, red dot = offline)

#### 2. Real-time Notifications
Listens for WebSocket events:
- `NEW_JOB` - New job scanned
- `NEW_MESSAGE` - Client sent a message
- `JOB_AWARDED` - Your bid was accepted
- `PROPOSAL_SENT` - Proposal sent successfully
- `DELIVERABLE_SUBMITTED` - Deliverable submitted
- `PAYMENT_REQUESTED` - Payment milestone requested
- `SCAN_COMPLETE` - Job scan finished
- `MONITORING_UPDATE` - Monitoring cycle completed

#### 3. Alert Badges
- Red badge on "Jobs" panel shows count of new jobs
- Red badge on "Actions" panel shows count of new messages
- Badges auto-update when new events arrive

## Workflow: After You Send a Proposal

### Phase 1: Waiting for Client Response (APPROVED status)
1. You send proposal via dashboard → Job status = `APPROVED`
2. System monitors for client messages and bid acceptance
3. Every 2 minutes (configurable), JobMonitor checks:
   - Are there new messages from this client?
   - Did the client accept your bid?

### Phase 2: Client Contacts You
**Scenario:** Client sends a message asking questions

1. JobMonitor detects new message via `getMessages()` API
2. Auto-generates draft reply using `generateAutoReply()`
3. Stores message in database with `reply_status = 'pending'`
4. Broadcasts `NEW_MESSAGE` event via WebSocket
5. Dashboard shows:
   - Notification: "💬 Message from [Client]: [preview]"
   - Red badge on Actions panel increments
   - Message appears in job details

### Phase 3: Client Awards Job
**Scenario:** Client accepts your bid

1. JobMonitor calls `getProjectDetails()` for each APPROVED job
2. Checks if `project.bid_stats.bid_awarded` is true
3. Finds your bid in `project.bids[]` and checks if `awarded = true`
4. Updates job status to `ACCEPTED`
5. Broadcasts `JOB_AWARDED` event via WebSocket
6. Dashboard shows:
   - Notification: "🎉 Job awarded: [Title] ($[Budget])"
   - Job status changes to ACCEPTED
   - Actions panel shows "Start Work & Generate Design" button

### Phase 4: You Accept and Start Work
1. Click "Start Work & Generate Design" button
2. System generates design automatically
3. Job status = `IN_PROGRESS`
4. Next step: Submit deliverable

## Database Changes

### Jobs Table
New status values:
- `SCANNED` → Initial state after job found
- `ANALYZED` → Analysis complete, ready to bid
- `APPROVED` → Proposal sent, waiting for client
- **`ACCEPTED`** → Client awarded job (NEW - set by JobMonitor)
- `IN_PROGRESS` → Work started
- `SUBMITTED` → Deliverable submitted
- `PAYMENT_REQUESTED` → Payment milestone requested
- `COMPLETED` → Job finished and paid

### Messages Table
Stores all client communications:
- `job_id` - Link to job
- `thread_id` - Freelancer thread ID
- `sender` - Client name
- `content` - Message text
- `draft_reply` - Auto-generated response
- `reply_status` - 'pending' or 'sent'

## Configuration

### Environment Variables
```
MONITOR_INTERVAL=120000        # Check every 2 minutes (in milliseconds)
FREELANCER_USER_ID=92669282    # Your Freelancer user ID (for filtering)
FREELANCER_OAUTH_TOKEN=...     # API token for authentication
```

### Manual Monitoring
You can manually trigger monitoring via API:

```bash
# Check for new messages
curl -X POST http://localhost:3000/api/monitor/check-messages

# Check for job awards
curl -X POST http://localhost:3000/api/monitor/check-awards

# Run full cycle
curl -X POST http://localhost:3000/api/monitor/run-cycle

# Get status
curl http://localhost:3000/api/monitor/status
```

## How It Detects Job Awards

The system checks the Freelancer API project details:

```javascript
// For each APPROVED job:
const project = await getProjectDetails(job.external_id);

// Check if bid was awarded
if (project.bid_stats.bid_awarded) {
  // Find your bid
  const yourBid = project.bids.find(bid => 
    bid.bidder_id === FREELANCER_USER_ID && bid.awarded === true
  );
  
  if (yourBid) {
    // Update job to ACCEPTED
    job.status = 'ACCEPTED';
  }
}
```

## Real-time Flow Diagram

```
Client Action          JobMonitor              Dashboard
─────────────────────────────────────────────────────────
Client sends msg  →  checkNewMessages()  →  NEW_MESSAGE  →  Notification
                      (every 2 min)          (WebSocket)      + Badge

Client accepts    →  checkJobAwards()    →  JOB_AWARDED  →  Status change
bid                   (every 2 min)          (WebSocket)      + Notification
```

## Testing the System

### Test 1: Manual Message Check
```bash
curl -X POST http://localhost:3000/api/monitor/check-messages
# Response: { success: true, newMessages: 0 }
```

### Test 2: Manual Award Check
```bash
curl -X POST http://localhost:3000/api/monitor/check-awards
# Response: { success: true, newAwards: 0 }
```

### Test 3: Monitor Status
```bash
curl http://localhost:3000/api/monitor/status
# Response: { success: true, isMonitoring: false, lastCheckTime: null, checkCount: 0 }
```

### Test 4: Dashboard WebSocket
1. Open dashboard in browser
2. Check browser console for "🔌 WebSocket connected"
3. Check for green monitoring dot in header
4. Monitoring status should show "Monitoring active"

## Troubleshooting

### WebSocket not connecting
- Check if WS_PORT (3001) is available
- Check browser console for connection errors
- Verify firewall allows WebSocket connections

### No messages detected
- Verify `FREELANCER_USER_ID` is correct in .env
- Check if messages are from different user (not yourself)
- Manually run `POST /api/monitor/check-messages` to test

### Job awards not detected
- Verify bid was actually placed (check Freelancer.com)
- Check if job status is `APPROVED` in database
- Manually run `POST /api/monitor/check-awards` to test
- Check API response for project details

### Monitoring not starting
- Check server logs for errors
- Verify `MONITOR_INTERVAL` is set in .env
- Check if JobMonitor is initialized in server.js

## Next Steps

1. **Deploy to Railway** - Push changes to GitHub
2. **Test with real jobs** - Send proposals and wait for client responses
3. **Monitor logs** - Watch server logs for monitoring activity
4. **Adjust interval** - Change `MONITOR_INTERVAL` if needed (lower = more frequent checks)
5. **Add more automation** - Could auto-generate designs when job is awarded

## Summary

The system now provides **semi-automatic workflow with your supervision**:

✅ **Automatic Detection:**
- Detects when clients contact you
- Detects when clients award jobs
- Generates draft replies automatically

✅ **Real-time Notifications:**
- WebSocket updates on dashboard
- Alert badges for new messages/jobs
- Toast notifications for important events

✅ **Manual Control:**
- You review messages before sending
- You approve design generation
- You control submission timing

This gives you the best of both worlds: automation where it helps, but you stay in control of important decisions.
