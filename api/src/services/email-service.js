const nodemailer = require('nodemailer');
const logger = require('winston');

class EmailService {
  constructor() {
    this.transporter = null;
    this.from = process.env.EMAIL_FROM || 'noreply@devxplatform.com';
    this.initialized = false;
  }

  async initialize() {
    try {
      // Check if email service is configured
      if (!process.env.EMAIL_SERVICE) {
        console.warn('No email service configured. Emails will be logged to console.');
        this.initialized = true;
        return;
      }

      // Configure based on service type
      if (process.env.EMAIL_SERVICE === 'smtp') {
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      } else if (process.env.EMAIL_SERVICE === 'sendgrid') {
        this.transporter = nodemailer.createTransporter({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          }
        });
      } else if (process.env.EMAIL_SERVICE === 'ses') {
        this.transporter = nodemailer.createTransporter({
          SES: require('aws-sdk').SES({
            apiVersion: '2010-12-01',
            region: process.env.AWS_REGION || 'us-east-1',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          })
        });
      }

      // Verify transporter configuration
      if (this.transporter) {
        await this.transporter.verify();
        console.log('✓ Email service initialized successfully');
      }

      this.initialized = true;
    } catch (error) {
      console.warn(`Email service initialization failed: ${error.message}`);
      console.warn('Emails will be logged to console in development mode.');
      this.initialized = true; // Continue without email service
    }
  }

  async sendEmail({ to, subject, text, html }) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const mailOptions = {
        from: this.from,
        to,
        subject,
        text,
        html
      };

      // If no transporter configured, log to console in development
      if (!this.transporter) {
        if (process.env.NODE_ENV === 'development') {
          console.log('\n📧 EMAIL (Development Mode):');
          console.log(`From: ${mailOptions.from}`);
          console.log(`To: ${mailOptions.to}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log(`Text: ${mailOptions.text}`);
          if (mailOptions.html) {
            console.log(`HTML: ${mailOptions.html}`);
          }
          console.log('────────────────────────────────\n');
          return { success: true, messageId: 'dev-mode' };
        } else {
          throw new Error('Email service not configured');
        }
      }

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}: ${result.messageId}`);
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  async sendWelcomeEmail(user) {
    const subject = 'Welcome to DevX Platform!';
    const text = `
Hello ${user.name || user.username}!

Welcome to DevX Platform! We're excited to have you on board.

Your account has been created successfully. You can now:
- Generate services from our template library
- Deploy applications with one click
- Monitor your services and costs
- Collaborate with your team

Get started: ${process.env.FRONTEND_URL || 'http://localhost:3000'}

If you have any questions, don't hesitate to reach out to our support team.

Best regards,
The DevX Platform Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to DevX Platform</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8f9fa; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to DevX Platform!</h1>
        </div>
        <div class="content">
            <h2>Hello ${user.name || user.username}!</h2>
            <p>Welcome to DevX Platform! We're excited to have you on board.</p>
            <p>Your account has been created successfully. You can now:</p>
            <ul>
                <li>Generate services from our template library</li>
                <li>Deploy applications with one click</li>
                <li>Monitor your services and costs</li>
                <li>Collaborate with your team</li>
            </ul>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Get Started</a>
            <p>If you have any questions, don't hesitate to reach out to our support team.</p>
            <p>Best regards,<br>The DevX Platform Team</p>
        </div>
    </div>
</body>
</html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
    
    const subject = 'Reset Your DevX Platform Password';
    const text = `
Hello ${user.name || user.username},

You recently requested to reset your password for your DevX Platform account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email and your password will remain unchanged.

Best regards,
The DevX Platform Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8f9fa; }
        .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reset Your Password</h1>
        </div>
        <div class="content">
            <h2>Hello ${user.name || user.username},</h2>
            <p>You recently requested to reset your password for your DevX Platform account.</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <div class="warning">
                <strong>Security Notice:</strong> This link will expire in 1 hour for security reasons.
            </div>
            <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
            <p>Best regards,<br>The DevX Platform Team</p>
        </div>
    </div>
</body>
</html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  }

  async sendEmailVerification(user, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    
    const subject = 'Verify Your DevX Platform Email';
    const text = `
Hello ${user.name || user.username},

Please verify your email address by clicking the link below:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with DevX Platform, please ignore this email.

Best regards,
The DevX Platform Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify Your Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8f9fa; }
        .button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Verify Your Email</h1>
        </div>
        <div class="content">
            <h2>Hello ${user.name || user.username},</h2>
            <p>Please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">Verify Email</a>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account with DevX Platform, please ignore this email.</p>
            <p>Best regards,<br>The DevX Platform Team</p>
        </div>
    </div>
</body>
</html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  }
}

// Export singleton instance
module.exports = new EmailService();