const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class SendGridService {
  constructor() {
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@naricare.app';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'NariCare Support';
  }

  // Send OTP email for 2FA
  async sendOTPEmail(toEmail, otpCode, userName = '') {
    try {
      const msg = {
        to: toEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: 'Your NariCare Security Code',
        html: this.getOTPEmailTemplate(otpCode, userName),
        text: `Your NariCare security code is: ${otpCode}. This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. If you didn't request this code, please ignore this email.`
      };

      await sgMail.send(msg);
      
      logger.info('OTP email sent successfully', {
        to: toEmail,
        otpLength: otpCode.length
      });

      return { success: true };
    } catch (error) {
      logger.error('SendGrid OTP email error:', {
        error: error.message,
        to: toEmail,
        code: error.code
      });
      
      throw new Error('Failed to send verification email');
    }
  }

  // Send welcome email after registration
  async sendWelcomeEmail(toEmail, userName) {
    try {
      const msg = {
        to: toEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: 'Welcome to NariCare! 💕',
        html: this.getWelcomeEmailTemplate(userName),
        text: `Welcome to NariCare, ${userName}! We're here to support you on your breastfeeding journey. Get started by completing your profile and adding your baby's information.`
      };

      await sgMail.send(msg);
      
      logger.info('Welcome email sent successfully', { to: toEmail });
      return { success: true };
    } catch (error) {
      logger.error('SendGrid welcome email error:', error);
      // Don't throw error for welcome email - it's not critical
      return { success: false, error: error.message };
    }
  }

  // Send consultation reminder email
  async sendConsultationReminder(toEmail, consultationDetails) {
    try {
      const { expertName, scheduledAt, topic, meetingLink } = consultationDetails;
      
      const msg = {
        to: toEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: 'Consultation Reminder - NariCare',
        html: this.getConsultationReminderTemplate(consultationDetails),
        text: `Reminder: Your consultation with ${expertName} about "${topic}" is scheduled for ${scheduledAt}. Meeting link: ${meetingLink}`
      };

      await sgMail.send(msg);
      
      logger.info('Consultation reminder sent successfully', { to: toEmail });
      return { success: true };
    } catch (error) {
      logger.error('SendGrid consultation reminder error:', error);
      throw new Error('Failed to send consultation reminder');
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(toEmail, resetToken, userName) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
      
      const msg = {
        to: toEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: 'Reset Your NariCare Password',
        html: this.getPasswordResetTemplate(resetUrl, userName),
        text: `You requested a password reset for your NariCare account. Click this link to reset your password: ${resetUrl}. This link will expire in 1 hour.`
      };

      await sgMail.send(msg);
      
      logger.info('Password reset email sent successfully', { to: toEmail });
      return { success: true };
    } catch (error) {
      logger.error('SendGrid password reset email error:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  // Email templates
  getOTPEmailTemplate(otpCode, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your NariCare Security Code</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #e91e63, #f06292); padding: 2rem; text-align: center; color: #ffffff; }
          .content { padding: 2rem; }
          .otp-code { background: #f8fafc; border: 2px solid #e91e63; border-radius: 12px; padding: 1.5rem; text-align: center; margin: 2rem 0; }
          .otp-number { font-size: 2rem; font-weight: 700; color: #e91e63; letter-spacing: 0.5rem; }
          .footer { background: #f8fafc; padding: 1.5rem; text-align: center; color: #64748b; font-size: 0.875rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Security Verification</h1>
            <p>Your NariCare account security code</p>
          </div>
          <div class="content">
            <h2>Hi ${userName || 'there'}! 👋</h2>
            <p>You requested a security code for your NariCare account. Please use the code below to complete your verification:</p>
            
            <div class="otp-code">
              <div class="otp-number">${otpCode}</div>
              <p style="margin: 0.5rem 0 0 0; color: #64748b;">Enter this code in the app</p>
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes</li>
              <li>Never share this code with anyone</li>
              <li>If you didn't request this code, please ignore this email</li>
            </ul>
            
            <p>Need help? Contact our support team at support@naricare.app</p>
          </div>
          <div class="footer">
            <p>© 2025 NariCare. All rights reserved.</p>
            <p>This email was sent to ${toEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getWelcomeEmailTemplate(userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to NariCare!</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #e91e63, #f06292); padding: 2rem; text-align: center; color: #ffffff; }
          .content { padding: 2rem; }
          .feature-list { background: #fef7f7; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; }
          .cta-button { display: inline-block; background: #e91e63; color: #ffffff; padding: 1rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 1rem 0; }
          .footer { background: #f8fafc; padding: 1.5rem; text-align: center; color: #64748b; font-size: 0.875rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💕 Welcome to NariCare!</h1>
            <p>Your breastfeeding support journey starts here</p>
          </div>
          <div class="content">
            <h2>Hi ${userName}! 🌟</h2>
            <p>Welcome to the NariCare community! We're thrilled to have you join thousands of mothers who are successfully navigating their breastfeeding journey with our support.</p>
            
            <div class="feature-list">
              <h3>🚀 What you can do now:</h3>
              <ul>
                <li><strong>Complete your profile</strong> - Add your baby's information</li>
                <li><strong>Explore our knowledge base</strong> - Expert-curated articles and guides</li>
                <li><strong>Join support groups</strong> - Connect with other mothers</li>
                <li><strong>Track growth</strong> - Monitor your baby's development</li>
                <li><strong>Chat with AI assistant</strong> - Get instant breastfeeding help</li>
              </ul>
            </div>
            
            <p>Ready to get started?</p>
            <a href="${process.env.FRONTEND_URL}" class="cta-button">Open NariCare App</a>
            
            <p>If you have any questions, our support team is here to help at support@naricare.app</p>
            
            <p>With love and support,<br>The NariCare Team 💕</p>
          </div>
          <div class="footer">
            <p>© 2025 NariCare. All rights reserved.</p>
            <p>Made with ❤️ for mothers everywhere</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getConsultationReminderTemplate(details) {
    const { userName, expertName, scheduledAt, topic, meetingLink } = details;
    const formattedDate = new Date(scheduledAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Consultation Reminder</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #42a5f5, #64b5f6); padding: 2rem; text-align: center; color: #ffffff; }
          .content { padding: 2rem; }
          .consultation-details { background: #f0f9ff; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; border-left: 4px solid #42a5f5; }
          .join-button { display: inline-block; background: #42a5f5; color: #ffffff; padding: 1rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 1rem 0; }
          .footer { background: #f8fafc; padding: 1.5rem; text-align: center; color: #64748b; font-size: 0.875rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Consultation Reminder</h1>
            <p>Your expert consultation is coming up!</p>
          </div>
          <div class="content">
            <h2>Hi ${userName}! 👋</h2>
            <p>This is a friendly reminder about your upcoming consultation with our lactation expert.</p>
            
            <div class="consultation-details">
              <h3>📋 Consultation Details:</h3>
              <p><strong>Expert:</strong> ${expertName}</p>
              <p><strong>Topic:</strong> ${topic}</p>
              <p><strong>Date & Time:</strong> ${formattedDate}</p>
              <p><strong>Duration:</strong> 30 minutes</p>
            </div>
            
            <p><strong>💡 To prepare for your consultation:</strong></p>
            <ul>
              <li>Write down any specific questions you have</li>
              <li>Have your baby's feeding log ready if relevant</li>
              <li>Find a quiet, private space for the call</li>
              <li>Test your camera and microphone</li>
            </ul>
            
            <p>You can join your consultation using the link below:</p>
            <a href="${meetingLink}" class="join-button">Join Consultation</a>
            
            <p><small>Note: You can join the meeting up to 15 minutes before the scheduled time.</small></p>
            
            <p>Looking forward to supporting you!</p>
            <p>The NariCare Team 💕</p>
          </div>
          <div class="footer">
            <p>© 2025 NariCare. All rights reserved.</p>
            <p>Need to reschedule? Contact us at support@naricare.app</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetTemplate(resetUrl, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #ef4444, #f87171); padding: 2rem; text-align: center; color: #ffffff; }
          .content { padding: 2rem; }
          .reset-button { display: inline-block; background: #ef4444; color: #ffffff; padding: 1rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 1rem 0; }
          .security-note { background: #fef2f2; border-radius: 8px; padding: 1rem; margin: 1.5rem 0; border-left: 4px solid #ef4444; }
          .footer { background: #f8fafc; padding: 1.5rem; text-align: center; color: #64748b; font-size: 0.875rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset</h1>
            <p>Reset your NariCare account password</p>
          </div>
          <div class="content">
            <h2>Hi ${userName}! 👋</h2>
            <p>You requested to reset your password for your NariCare account. Click the button below to create a new password:</p>
            
            <a href="${resetUrl}" class="reset-button">Reset My Password</a>
            
            <div class="security-note">
              <h3>🛡️ Security Information:</h3>
              <ul>
                <li>This link will expire in 1 hour for your security</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your current password remains unchanged until you create a new one</li>
              </ul>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #64748b; font-size: 0.875rem;">${resetUrl}</p>
            
            <p>Need help? Contact our support team at support@naricare.app</p>
          </div>
          <div class="footer">
            <p>© 2025 NariCare. All rights reserved.</p>
            <p>This email was sent for security purposes</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send crisis intervention email
  async sendCrisisInterventionEmail(toEmail, userName, resources) {
    try {
      const msg = {
        to: toEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: 'Important Resources - NariCare Support',
        html: this.getCrisisInterventionTemplate(userName, resources),
        text: `Hi ${userName}, we noticed you might be going through a difficult time. Please know that you're not alone and help is available. Crisis Hotline: 988, Emergency: 911. Find local resources at: https://www.postpartum.net/get-help/locations/`
      };

      await sgMail.send(msg);
      
      logger.info('Crisis intervention email sent successfully', { to: toEmail });
      return { success: true };
    } catch (error) {
      logger.error('SendGrid crisis intervention email error:', error);
      throw new Error('Failed to send crisis intervention email');
    }
  }

  getCrisisInterventionTemplate(userName, resources) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You Are Not Alone - Support Resources</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #10b981, #34d399); padding: 2rem; text-align: center; color: #ffffff; }
          .content { padding: 2rem; }
          .resource-card { background: #f0fdf4; border-radius: 12px; padding: 1.5rem; margin: 1rem 0; border-left: 4px solid #10b981; }
          .emergency-card { background: #fef2f2; border-radius: 12px; padding: 1.5rem; margin: 1rem 0; border-left: 4px solid #ef4444; }
          .phone-link { color: #ef4444; font-weight: 700; font-size: 1.2rem; text-decoration: none; }
          .footer { background: #f8fafc; padding: 1.5rem; text-align: center; color: #64748b; font-size: 0.875rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💚 You Are Not Alone</h1>
            <p>Support and resources are available</p>
          </div>
          <div class="content">
            <h2>Dear ${userName}, 🤗</h2>
            <p>We noticed you might be going through a difficult time. Please know that what you're feeling is valid, and reaching out for help is a sign of incredible strength.</p>
            
            <div class="emergency-card">
              <h3>🚨 Immediate Help Available:</h3>
              <p><strong>Crisis Hotline:</strong> <a href="tel:988" class="phone-link">988</a></p>
              <p><strong>Emergency Services:</strong> <a href="tel:911" class="phone-link">911</a></p>
              <p><em>Available 24/7 - You don't have to face this alone</em></p>
            </div>
            
            <div class="resource-card">
              <h3>🌟 Additional Support Resources:</h3>
              <ul>
                <li><strong>Postpartum Support International:</strong> <a href="https://www.postpartum.net/get-help/locations/">Find local resources</a></li>
                <li><strong>Crisis Text Line:</strong> Text HOME to 741741</li>
                <li><strong>National Maternal Mental Health Hotline:</strong> 1-833-9-HELP4MOMS</li>
              </ul>
            </div>
            
            <p><strong>Remember:</strong></p>
            <ul>
              <li>These feelings are temporary and treatable</li>
              <li>You are a good mother, even when it doesn't feel like it</li>
              <li>Asking for help makes you stronger, not weaker</li>
              <li>Your baby needs you healthy and supported</li>
            </ul>
            
            <p>Our NariCare expert team is also here for you. Consider booking a consultation for additional support.</p>
            
            <p>With care and support,<br>The NariCare Team 💕</p>
          </div>
          <div class="footer">
            <p>© 2025 NariCare. All rights reserved.</p>
            <p>This email contains important mental health resources</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new SendGridService();