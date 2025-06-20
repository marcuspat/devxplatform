import { Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';
import { EmailJobData } from '../queues';

// Create email transporter
let transporter: nodemailer.Transporter | null = null;

function createTransporter() {
  if (!config.email.host) {
    logger.warn('Email host not configured, using ethereal email for testing');
    // Use Ethereal Email for testing
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }

  return nodemailer.createTransporter({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: config.email.auth,
  });
}

// Email templates
const emailTemplates = {
  welcome: {
    subject: 'Welcome to our platform!',
    html: `
      <h1>Welcome {{name}}!</h1>
      <p>Thank you for joining our platform. We're excited to have you aboard.</p>
      <p>Best regards,<br>The Team</p>
    `,
  },
  passwordReset: {
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>Hi {{name}},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="{{resetUrl}}">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  },
  notification: {
    subject: 'Notification: {{title}}',
    html: `
      <h1>{{title}}</h1>
      <p>{{message}}</p>
      <p>Time: {{timestamp}}</p>
    `,
  },
};

function replaceVariables(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

export async function emailProcessor(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, text, html, template, variables, attachments } = job.data;
  
  logger.info(`Processing email job ${job.id} for ${to}`);

  try {
    // Initialize transporter if not already done
    if (!transporter) {
      transporter = createTransporter();
    }

    let finalSubject = subject;
    let finalHtml = html;
    let finalText = text;

    // Handle template-based emails
    if (template && emailTemplates[template as keyof typeof emailTemplates]) {
      const emailTemplate = emailTemplates[template as keyof typeof emailTemplates];
      finalSubject = variables ? replaceVariables(emailTemplate.subject, variables) : emailTemplate.subject;
      finalHtml = variables ? replaceVariables(emailTemplate.html, variables) : emailTemplate.html;
    }

    // Replace variables in custom content
    if (variables) {
      if (finalSubject) {
        finalSubject = replaceVariables(finalSubject, variables);
      }
      if (finalHtml) {
        finalHtml = replaceVariables(finalHtml, variables);
      }
      if (finalText) {
        finalText = replaceVariables(finalText, variables);
      }
    }

    // Prepare email options
    const mailOptions: nodemailer.SendMailOptions = {
      from: config.email.from,
      to,
      subject: finalSubject,
      text: finalText,
      html: finalHtml,
      attachments,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`Email sent successfully to ${to}`, {
      messageId: info.messageId,
      jobId: job.id,
    });

    // Update job progress
    await job.updateProgress(100);

  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    throw error; // This will mark the job as failed
  }
}