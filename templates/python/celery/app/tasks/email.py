"""
Email-related Celery tasks
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Optional
import structlog

from app.celery_app import celery
from app.config import settings
from app.utils.retry import exponential_backoff

logger = structlog.get_logger()


@celery.task(
    bind=True,
    name='app.tasks.email.send_email',
    queue='email',
    rate_limit=settings.TASK_RATE_LIMIT,
    max_retries=settings.TASK_MAX_RETRIES,
    default_retry_delay=settings.TASK_RETRY_DELAY
)
def send_email(
    self,
    to_email: str,
    subject: str,
    body: str,
    from_email: Optional[str] = None,
    html_body: Optional[str] = None,
    attachments: Optional[List[Dict]] = None
) -> Dict:
    """
    Send a single email
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Email body (plain text)
        from_email: Sender email (optional)
        html_body: HTML body (optional)
        attachments: List of attachments (optional)
    
    Returns:
        Dict with task result
    """
    try:
        logger.info(
            "Sending email",
            to_email=to_email,
            subject=subject,
            task_id=self.request.id
        )
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = from_email or settings.EMAIL_FROM
        msg['To'] = to_email
        
        # Add text body
        text_part = MIMEText(body, 'plain')
        msg.attach(text_part)
        
        # Add HTML body if provided
        if html_body:
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
        
        # Add attachments if provided
        if attachments:
            for attachment in attachments:
                # Handle attachment logic here
                pass
        
        # Send email
        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            if settings.EMAIL_USE_TLS:
                server.starttls()
            
            if settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD:
                server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
            
            server.send_message(msg)
        
        logger.info(
            "Email sent successfully",
            to_email=to_email,
            task_id=self.request.id
        )
        
        return {
            'status': 'success',
            'to_email': to_email,
            'subject': subject,
            'task_id': self.request.id
        }
        
    except Exception as exc:
        logger.error(
            "Failed to send email",
            to_email=to_email,
            error=str(exc),
            task_id=self.request.id
        )
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            retry_delay = exponential_backoff(
                self.request.retries,
                base_delay=settings.TASK_RETRY_DELAY,
                max_delay=settings.TASK_RETRY_BACKOFF_MAX
            )
            raise self.retry(countdown=retry_delay, exc=exc)
        
        raise exc


@celery.task(
    bind=True,
    name='app.tasks.email.send_bulk_email',
    queue='email',
    rate_limit='10/m',  # Lower rate for bulk operations
    max_retries=settings.TASK_MAX_RETRIES
)
def send_bulk_email(
    self,
    recipients: List[str],
    subject: str,
    body: str,
    from_email: Optional[str] = None,
    html_body: Optional[str] = None,
    batch_size: int = 100
) -> Dict:
    """
    Send bulk emails in batches
    
    Args:
        recipients: List of recipient email addresses
        subject: Email subject
        body: Email body (plain text)
        from_email: Sender email (optional)
        html_body: HTML body (optional)
        batch_size: Number of emails to send per batch
    
    Returns:
        Dict with task result
    """
    try:
        logger.info(
            "Starting bulk email send",
            recipient_count=len(recipients),
            batch_size=batch_size,
            task_id=self.request.id
        )
        
        results = {
            'total': len(recipients),
            'sent': 0,
            'failed': 0,
            'task_id': self.request.id
        }
        
        # Process recipients in batches
        for i in range(0, len(recipients), batch_size):
            batch = recipients[i:i + batch_size]
            
            logger.info(
                "Processing email batch",
                batch_number=i // batch_size + 1,
                batch_size=len(batch),
                task_id=self.request.id
            )
            
            # Send individual emails for each recipient in batch
            for recipient in batch:
                try:
                    # Use the single email task for each recipient
                    send_email.delay(
                        to_email=recipient,
                        subject=subject,
                        body=body,
                        from_email=from_email,
                        html_body=html_body
                    )
                    results['sent'] += 1
                    
                except Exception as e:
                    logger.error(
                        "Failed to queue email for recipient",
                        recipient=recipient,
                        error=str(e),
                        task_id=self.request.id
                    )
                    results['failed'] += 1
        
        logger.info(
            "Bulk email task completed",
            results=results,
            task_id=self.request.id
        )
        
        return results
        
    except Exception as exc:
        logger.error(
            "Bulk email task failed",
            error=str(exc),
            task_id=self.request.id
        )
        raise exc


@celery.task(
    bind=True,
    name='app.tasks.email.send_template_email',
    queue='email',
    rate_limit=settings.TASK_RATE_LIMIT
)
def send_template_email(
    self,
    to_email: str,
    template_name: str,
    context: Dict,
    from_email: Optional[str] = None
) -> Dict:
    """
    Send an email using a template
    
    Args:
        to_email: Recipient email address
        template_name: Name of the email template
        context: Template context variables
        from_email: Sender email (optional)
    
    Returns:
        Dict with task result
    """
    try:
        logger.info(
            "Sending template email",
            to_email=to_email,
            template_name=template_name,
            task_id=self.request.id
        )
        
        # Load and render template
        # This is a placeholder - implement your template loading logic
        subject = f"Template: {template_name}"
        body = f"Template body with context: {context}"
        
        # Use the single email task
        result = send_email.delay(
            to_email=to_email,
            subject=subject,
            body=body,
            from_email=from_email
        )
        
        return {
            'status': 'success',
            'template_name': template_name,
            'to_email': to_email,
            'task_id': self.request.id,
            'email_task_id': result.id
        }
        
    except Exception as exc:
        logger.error(
            "Template email task failed",
            error=str(exc),
            task_id=self.request.id
        )
        raise exc