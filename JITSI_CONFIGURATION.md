# Jitsi Meet Configuration for Guest Access

This document explains how the app is configured to allow users to join video consultations without requiring login to Jitsi Meet.

## Current Implementation

### 1. Meeting Link Format
- **Current**: `https://meet.jit.si/NariCare{timestamp}{randomString}`
- **Example**: `https://meet.jit.si/NariCare12345678abc123`
- **Benefits**: Short, unique room names optimized for direct access

### 2. Dual Video Call Approach
Due to Jitsi Meet's authentication requirements on public servers, we implement two approaches:

**A) Browser Option (Recommended)**
- Opens meeting directly in browser tab
- Uses native Jitsi Meet interface
- Best compatibility and reliability

**B) In-App Call (Fallback)**
- Embeds meeting via iframe in the app
- May still show authentication prompts
- Simplified interface within NariCare app

### 3. User Options
Users get two options when joining a consultation:

1. **Open in Browser** (Recommended for login issues)
   - Opens the Jitsi link directly in a new browser tab
   - Bypasses any in-app authentication issues
   - Uses the standard Jitsi web interface

2. **Use In-App Call**
   - Embeds Jitsi within the NariCare app
   - Uses custom NariCare branding and simplified UI
   - May require additional permissions

## Troubleshooting Login Issues

### If users are still prompted to login:

**IMPORTANT**: If the authentication dialog still appears despite our configuration, this is likely due to Jitsi Meet's server-side policies that we cannot override via client configuration alone.

**Immediate Solutions**:
1. **Use Browser Option** (Recommended): Click "Open in Browser" from the consultation join options
2. **Wait for Moderator**: If someone clicks "Wait for moderator" button, the first person to join becomes the moderator
3. **Try Incognito/Private Mode**: Open the meeting link in an incognito/private browser window

**Technical Notes**:
- The "Waiting for authenticated user" dialog appears when Jitsi's servers enforce authentication policies
- Our client-side configuration can disable many auth features, but cannot override server-side restrictions
- Using the browser option bypasses the embedded iframe restrictions

### Alternative Solutions (if needed):

1. **Self-hosted Jitsi**: Host your own Jitsi instance with custom authentication rules
2. **Different Video Platform**: Consider alternatives like:
   - Whereby.com (guest-friendly)
   - Google Meet with anonymous joining
   - Zoom with waiting room disabled
   - Daily.co with guest access

3. **Custom Room Names**: Use even simpler room naming:
   ```typescript
   const meetingLink = `https://meet.jit.si/${Date.now()}${Math.random().toString(36).substring(7)}`;
   ```

## Implementation Notes

### Current Implementation Status ✅
- ✅ Guest-friendly URL format
- ✅ Disabled authentication requirements in config
- ✅ Browser fallback option for users
- ✅ Clean room naming without special characters
- ✅ Simplified toolbar for consultations

### If Issues Persist
The most reliable solution is the "Open in Browser" option, which:
- Uses the standard Jitsi Meet web interface
- Avoids any in-app authentication complications  
- Allows users to join as guests directly
- Works on all devices and browsers

## Testing
To test guest access:
1. Create a consultation booking
2. Try both join options when ready
3. Verify no login prompts appear
4. Ensure video and audio work correctly

If users still see login prompts, the "Open in Browser" option should resolve the issue immediately.