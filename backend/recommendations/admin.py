from django.contrib import admin

from .models import OTPLog, MessageLog


@admin.register(OTPLog)
class OTPLogAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'otp_code', 'status', 'is_verified', 'attempts', 'created_at')
    list_filter = ('status', 'is_verified')
    search_fields = ('phone_number', 'message_id')


@admin.register(MessageLog)
class MessageLogAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'message_type', 'file_name', 'status', 'created_at')
    list_filter = ('status', 'message_type')
    search_fields = ('phone_number', 'message_id', 'file_name')
