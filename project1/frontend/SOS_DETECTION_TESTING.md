# 🚨 Smart SOS Detection - Testing Guide

## Overview
Smart SOS Detection can automatically trigger emergency alerts based on:
- **Shake Detection**: Device shake/motion detection
- **Audio Detection**: Loud sound/scream detection

## Prerequisites

### 1. Browser Requirements
- **Chrome/Edge**: Full support ✅
- **Firefox**: Limited support (no shake on desktop) ⚠️
- **Safari**: Requires user permission on iOS ⚠️
- **HTTPS Required**: Microphone access needs secure connection 🔒

### 2. Permissions Needed
- **Motion/Accelerometer**: For shake detection
- **Microphone**: For audio detection

## Testing Steps

### Step 1: Enable Smart SOS Detection
1. Click the red SOS button (bottom-left of screen)
2. Toggle ON "Smart SOS Detection"
3. **Look for green indicators**: "🤚 Shake Detection: Active" and "🎤 Audio Detection: Active"
4. Grant microphone permission when browser asks

### Step 2: Test Shake Detection

#### Desktop Testing:
Shake detection on desktop is **limited** because:
- Most computers don't have accelerometers
- Laptops with hard drives may have basic motion sensors
- DeviceMotionEvent may not fire

**To test on desktop:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for: `✅ Smart SOS Shake Detection: Enabled`
4. If you see `Motion magnitude: X.XX`, sensor is working
5. Try moving laptop rapidly or tapping it

**Expected behavior:**
- If magnitude > 15: `🔴 Shake detected! Magnitude: XX.XX`
- 10-second countdown starts
- Alarm sound plays

#### Mobile Testing (Recommended):
1. Open SafeCity on your phone
2. Enable Smart SOS Detection
3. **Shake your phone vigorously**
4. Should see countdown popup

**Troubleshooting Mobile:**
- iOS: May need to tap "Allow Motion" in browser settings
- Some browsers block motion events until user interaction
- Try refreshing and enabling detection AFTER tapping on screen

### Step 3: Test Audio Detection

#### Testing Loud Sounds:
1. Enable Smart SOS Detection
2. Open browser console (F12 → Console)
3. Look for: `✅ Smart SOS Audio Detection: Enabled`
4. Look for: `🎤 Requesting microphone permission...`
5. **Grant microphone permission**

**Ways to test:**
- Clap loudly near microphone
- Shout/scream
- Play loud alarm sound on another device
- Whistle loudly

**Expected behavior:**
- Console shows: `Audio level: XX.XX` (if you uncomment debug line)
- If level > 120: `🔴 Loud audio detected! Level: XXX.XX`
- 10-second countdown starts
- Alarm sound plays

**Troubleshooting Audio:**
```
⚠️ Microphone access denied or not supported:
   1. Allow microphone permission in browser settings
   2. Use HTTPS (required for microphone access)
   3. Check if microphone is available on your device
```

### Step 4: Verify Detection Works
When detection triggers:
1. **Alarm sound plays** (looping)
2. **Red popup appears** at top of screen
3. **10-second countdown** displays
4. Shows detection type: "Shake detected" or "Loud sound detected"
5. **Cancel button** available to stop

If countdown reaches 0:
- Alarm stops
- SOS alert is sent to backend
- Police dashboard receives notification

## Debugging

### Check Console Logs

**When Smart SOS is enabled:**
```
✅ Smart SOS Shake Detection: Enabled
✅ Smart SOS Audio Detection: Enabled
🎤 Requesting microphone permission...
```

**When detection works:**
```
🔴 Shake detected! Magnitude: 18.45
// OR
🔴 Loud audio detected! Level: 156.23
```

**When disabled:**
```
📴 Smart SOS Shake Detection: Disabled
📴 Smart SOS Audio Detection: Disabled
```

### Enable Debug Logging

To see real-time sensor values, uncomment these lines in `useSmartSOS.ts`:

```typescript
// Line 123 - For shake detection
console.log('Motion magnitude:', magnitude.toFixed(2));

// Line 186 - For audio detection
console.log('Audio level:', average.toFixed(2));
```

This will show:
```
Motion magnitude: 8.32
Motion magnitude: 9.15
Motion magnitude: 18.72  ← Should trigger at >15
Audio level: 45.23
Audio level: 48.91
Audio level: 132.45  ← Should trigger at >120
```

## Sensitivity Adjustments

### Shake Detection Threshold
File: `frontend/src/hooks/useSmartSOS.ts` (Line ~127)
```typescript
if (magnitude > 15) {  // Lower = more sensitive
```
- Current: 15
- Recommended range: 12-20
- Lower = triggers easier

### Audio Detection Threshold
File: `frontend/src/hooks/useSmartSOS.ts` (Line ~189)
```typescript
if (average > 120) {  // Lower = more sensitive
```
- Current: 120
- Recommended range: 100-150
- Lower = triggers easier

### Debounce Time
Prevents multiple triggers:
```typescript
// Shake debounce (Line ~129)
if (now - lastShakeTimeRef.current > 3000) {  // 3 seconds

// Audio debounce (Line ~191)
if (now - lastAudioTimeRef.current > 3000) {  // 3 seconds
```

## Common Issues

### Issue 1: "Microphone access denied"
**Solution:**
1. Click padlock icon in address bar
2. Allow microphone permission
3. Refresh page
4. Re-enable Smart SOS Detection

### Issue 2: Shake not detected on desktop
**Solution:**
- This is **expected** - most desktops don't have accelerometers
- Test on mobile device instead
- Or use audio detection only

### Issue 3: Audio detection not working
**Checklist:**
- [ ] Using HTTPS or localhost?
- [ ] Microphone permission granted?
- [ ] Console shows "Audio Detection: Enabled"?
- [ ] Try making VERY loud noise
- [ ] Check if microphone is working in other apps
- [ ] Try different browser (Chrome recommended)

### Issue 4: False positives
**If triggering too easily:**
- Increase threshold values (15 → 20 for shake, 120 → 150 for audio)
- Increase debounce time (3000 → 5000 milliseconds)

### Issue 5: Not sensitive enough
**If not triggering when it should:**
- Lower threshold values (15 → 12 for shake, 120 → 100 for audio)
- Enable debug logging to see actual values
- Try more vigorous motions/louder sounds

## Production Notes

### Security
- Motion/audio detection only works when modal is open
- Detection stops when modal is closed
- User must explicitly enable the feature
- 10-second countdown allows cancellation

### Performance
- Audio analysis uses requestAnimationFrame (60fps)
- Debouncing prevents repeated triggers
- AudioContext properly cleaned up on unmount

### Privacy
- Microphone stream is **NOT recorded**
- Only analyzes volume levels in real-time
- No audio data is stored or transmitted
- Stream is closed when detection is disabled

## Support

If detection still doesn't work after following this guide:
1. Check browser console for errors
2. Try different browser
3. Test on mobile device
4. Verify microphone works in other apps
5. Check that device has motion sensors (for shake)

For best results:
- Use Chrome or Edge browser
- Test on actual mobile device
- Ensure HTTPS connection
- Grant all permissions when prompted
