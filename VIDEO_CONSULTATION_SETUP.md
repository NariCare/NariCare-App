# Video Consultation Setup - Whereby Integration

This document explains the video consultation implementation using Whereby.com for true guest access without authentication requirements.

## Why Whereby Instead of Jitsi Meet

**Problem with Jitsi Meet:**
- Public Jitsi servers now require authentication/moderation
- Users see "Waiting for authenticated user" dialogs
- Cannot be bypassed with client-side configuration

**Solution with Whereby:**
- True guest access - no authentication required
- Users can join immediately without prompts
- Professional video call experience
- No server setup required

## Current Implementation

### 1. Meeting Link Format
- **Service**: Whereby.com
- **Format**: `https://whereby.com/naricare-{timestamp}-{random}`
- **Example**: `https://whereby.com/naricare-12345678-abc123`

### 2. User Experience
Users get two options when joining consultations:

**A) Open in Browser**
- Opens Whereby directly in browser tab
- Full feature set and best performance
- Recommended for most users

**B) Use In-App Call**
- Embedded Whereby iframe within the app
- Consistent app experience
- Same functionality as browser option

### 3. Key Benefits
- ✅ **No authentication required** - true guest access
- ✅ **Immediate joining** - no waiting for moderators
- ✅ **Professional interface** - clean, medical-friendly UI
- ✅ **Mobile optimized** - works great on phones/tablets
- ✅ **Reliable service** - enterprise-grade infrastructure

## Technical Implementation

### Meeting Link Generation
```typescript
// In consultation-booking-modal.component.ts
const timestamp = Date.now().toString().slice(-8);
const randomString = Math.random().toString(36).substring(2, 8);
const meetingId = `naricare-${timestamp}-${randomString}`;
const meetingLink = `https://whereby.com/${meetingId}`;
```

### Video Call Page
```typescript
// In video-call.page.ts
private initializeDirectVideoCall() {
  const meetingUrl = `https://whereby.com/${this.meetingId}`;
  
  const iframe = document.createElement('iframe');
  iframe.src = meetingUrl;
  iframe.allow = 'camera; microphone; display-capture; fullscreen; geolocation';
  // ... iframe setup
}
```

## Whereby Features Available

### Free Tier Includes:
- Up to 4 participants per room
- Unlimited meeting duration
- Screen sharing
- Chat functionality
- Mobile apps
- Recording (basic)

### Perfect for Medical Consultations:
- HIPAA-compliant options available
- Professional appearance
- Waiting room functionality
- Custom branding options (paid plans)

## Migration Notes

### From Existing Jitsi Consultations:
- New consultations automatically use Whereby
- Existing consultations with Jitsi links still work (but may show auth prompts)
- Consider migrating existing consultation links if needed

### Future Enhancements:
1. **Whereby API Integration**: For more control over room creation
2. **Custom Branding**: Add NariCare branding to video calls
3. **Recording Integration**: Automatic session recording for notes
4. **Calendar Integration**: Direct calendar invites with Whereby links

## Troubleshooting

### If Users Have Issues:
1. **Browser Option**: Always recommend browser option first
2. **Clear Cache**: Clear browser cache and cookies
3. **Update Browser**: Ensure modern browser with WebRTC support
4. **Permissions**: Check camera/microphone permissions

### Common Solutions:
- **"Camera not working"**: Check browser permissions
- **"Can't hear audio"**: Check microphone/speaker settings
- **"Room not found"**: Verify meeting link is correct

## Cost Considerations

- **Free tier**: Perfect for current needs (up to 4 participants)
- **Paid plans**: Available if more features needed
- **No setup costs**: No server infrastructure required

This implementation provides a reliable, professional video consultation experience without the authentication issues that plagued the Jitsi Meet integration.