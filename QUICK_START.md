# Quick Start: Client Contact & Job Award Detection

## What's New?

Your system now automatically detects:
- ✅ When clients send you messages
- ✅ When clients award jobs to you
- ✅ Real-time notifications on dashboard
- ✅ Auto-generated draft replies

## How It Works

### The Workflow After You Send a Proposal

```
1. You send proposal → Job status = APPROVED
                ↓
2. System monitors every 2 minutes for:
   - New messages from client
   - Client accepting your bid
                ↓
3. Client sends message or awards job
                ↓
4. Dashboard shows notification + updates
                ↓
5. You review and take next action
```

## Starting the System

### Local Development
```bash
cd "D:\thietke kiem tien"
npm start
```

Server will start with:
- 🚀 HTTP API on `http://localhost:3000`
- 📡 WebSocket on `ws://localhost:3001`
- 🔍 Job scanner every 60 seconds
- 📬 Job monitor every 120 seconds (2 minutes)

### Production (Railway)
```bash
git add .
git commit -m "Add client contact detection and job award monitoring"
git push origin main
```

Railway will auto-deploy and start monitoring.

## Dashboard Features

### 1. Monitoring Status (Header)
- Green dot = Monitoring active
- Red dot = Monitoring offline
- Shows "Monitoring active" or "Monitoring offline"

### 2. Alert Badges
- Red badge on "📋 Jobs" = New jobs found
- Red badge on "🎯 Actions" = New client messages

### 3. Real-time Notifications
Toast notifications appear for:
- 🎉 New job found
- 💬 Client message received
- 🎉 Job awarded to you
- ✅ Proposal sent
- 📤 Deliverable submitted
- 💰 Payment requested

### 4. Job Status Flow
```
ANALYZED → APPROVED → ACCEPTED → IN_PROGRESS → SUBMITTED → PAYMENT_REQUESTED → COMPLETED
           (you bid)  (awarded)   (you start)   (you submit) (you request $)    (paid)
```

## Testing the System

### Test 1: Manual Message Check
```bash
curl -X POST http://localhost:3000/api/monitor/check-messages
```

### Test 2: Manual Award Check
```bash
curl -X POST http://localhost:3000/api/monitor/check-awards
```

### Test 3: Full Monitoring Cycle
```bash
curl -X POST http://localhost:3000/api/monitor/run-cycle
```

### Test 4: Get Monitoring Status
```bash
curl http://localhost:3000/api/monitor/status
```

### Test 5: Run Test Script
```bash
node test-monitoring.js
```

## Configuration

### Monitoring Interval
Edit `.env`:
```
MONITOR_INTERVAL=120000    # 2 minutes (in milliseconds)
```

Change to:
- `60000` = Check every 1 minute (more frequent)
- `30000` = Check every 30 seconds (very frequent)
- `300000` = Check every 5 minutes (less frequent)

### User ID
Make sure `FREELANCER_USER_ID` is correct in `.env`:
```
FREELANCER_USER_ID=92669282
```

This is used to filter out your own messages and identify your bids.

## What Happens When...

### Client Sends a Message
1. JobMonitor detects it via Freelancer API
2. Auto-generates draft reply
3. Stores in database
4. Broadcasts to dashboard
5. You see notification: "💬 Message from [Client]: [preview]"
6. You can review and send reply

### Client Awards Your Bid
1. JobMonitor checks project details
2. Finds your bid with `awarded = true`
3. Updates job status to `ACCEPTED`
4. Broadcasts to dashboard
5. You see notification: "🎉 Job awarded: [Title] ($[Budget])"
6. Actions panel shows "Start Work & Generate Design"

### You Click "Start Work"
1. System generates design automatically
2. Job status = `IN_PROGRESS`
3. Next: Submit deliverable

## Troubleshooting

### WebSocket Not Connecting
**Problem:** Dashboard shows red dot, "Monitoring offline"

**Solution:**
1. Check if server is running: `http://localhost:3000`
2. Check if WS_PORT is available (default 3001)
3. Check browser console for errors
4. Try refreshing dashboard

### No Messages Detected
**Problem:** Client sent message but system didn't detect it

**Solution:**
1. Verify `FREELANCER_USER_ID` in .env is correct
2. Check if message is from a different user (not yourself)
3. Manually test: `curl -X POST http://localhost:3000/api/monitor/check-messages`
4. Check server logs for errors

### Job Awards Not Detected
**Problem:** You won a bid but system didn't update

**Solution:**
1. Verify job status is `APPROVED` in database
2. Verify bid was actually placed on Freelancer.com
3. Manually test: `curl -X POST http://localhost:3000/api/monitor/check-awards`
4. Check server logs for API errors

### Monitoring Not Starting
**Problem:** Server starts but monitoring doesn't run

**Solution:**
1. Check server logs for "📬 Job monitor will run every..."
2. Verify `MONITOR_INTERVAL` is set in .env
3. Check if JobMonitor is initialized in server.js
4. Restart server

## API Endpoints

### Monitor Routes
```
GET  /api/monitor/status           Get monitoring status
POST /api/monitor/check-messages   Check for new messages
POST /api/monitor/check-awards     Check for job awards
POST /api/monitor/run-cycle        Run full monitoring cycle
POST /api/monitor/start            Start auto-monitoring
POST /api/monitor/stop             Stop auto-monitoring
```

### Example Responses

**GET /api/monitor/status**
```json
{
  "success": true,
  "isMonitoring": false,
  "lastCheckTime": "2026-05-16T09:15:00.000Z",
  "checkCount": 5
}
```

**POST /api/monitor/check-messages**
```json
{
  "success": true,
  "newMessages": 2
}
```

**POST /api/monitor/check-awards**
```json
{
  "success": true,
  "newAwards": 1
}
```

## Files Changed/Added

### New Files
- `backend/services/jobMonitor.js` - Monitoring logic
- `backend/routes/monitor.js` - Monitor API endpoints
- `MONITORING_SYSTEM.md` - Detailed documentation
- `test-monitoring.js` - Test script

### Modified Files
- `backend/server.js` - Added monitor routes and auto-start
- `public/index.html` - Added WebSocket, notifications, badges
- `.env` - Added MONITOR_INTERVAL setting

## Next Steps

1. **Deploy to Railway**
   ```bash
   git push origin main
   ```

2. **Test with real jobs**
   - Send proposals on Freelancer.com
   - Wait for client responses
   - Watch dashboard for notifications

3. **Monitor logs**
   - Check server logs for monitoring activity
   - Look for "📬 Checking for new client messages..."
   - Look for "🎯 Checking for job awards..."

4. **Adjust settings**
   - Change MONITOR_INTERVAL if needed
   - Add more keywords to job scanner
   - Customize auto-reply messages

## Summary

✅ **Automatic Detection:**
- Detects client messages
- Detects job awards
- Generates draft replies

✅ **Real-time Updates:**
- WebSocket notifications
- Alert badges
- Toast messages

✅ **Semi-automatic Workflow:**
- You stay in control
- System handles detection
- You approve actions

The system is now ready to monitor your Freelancer account and notify you of important client interactions!
