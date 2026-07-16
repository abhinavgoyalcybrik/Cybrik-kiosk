from django.utils import timezone
from django.db import models

class OTPLog(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
        ('failed', 'Failed'),
    ]

    phone_number = models.CharField(max_length=20, db_index=True)
    otp_code = models.CharField(max_length=6)
    message_id = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_verified = models.BooleanField(default=False)
    attempts = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"{self.phone_number} - {self.otp_code} ({self.status})"


class MessageLog(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
        ('failed', 'Failed'),
    ]
    MESSAGE_TYPE_CHOICES = [
        ('text', 'Text'),
        ('document', 'Document'),
        ('checklist', 'Checklist'),
    ]

    phone_number = models.CharField(max_length=20, db_index=True)
    message_id = models.CharField(max_length=255, blank=True, db_index=True)
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPE_CHOICES)
    file_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.phone_number} - {self.message_type} ({self.status})"