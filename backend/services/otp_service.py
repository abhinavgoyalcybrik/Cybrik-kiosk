import random
from datetime import timedelta
from django.utils import timezone

from recommendations.models import OTPLog
from services.meta_whatsapp_service import MetaWhatsAppService

OTP_EXPIRY_MINUTES = 5
MAX_ATTEMPTS = 3
RESEND_COOLDOWN_SECONDS = 60


def generate_otp(phone_number):
    """Generate a 6-digit OTP, store it, and send it via WhatsApp."""
    phone = str(phone_number).replace("+", "").strip()

    # Rate limit: block rapid repeat requests for the same number
    recent = OTPLog.objects.filter(phone_number=phone).order_by('-created_at').first()
    if recent:
        seconds_since = (timezone.now() - recent.created_at).total_seconds()
        if seconds_since < RESEND_COOLDOWN_SECONDS:
            wait_time = int(RESEND_COOLDOWN_SECONDS - seconds_since)
            return {"success": False, "error": f"Please wait {wait_time} seconds before requesting another OTP"}

    otp_code = f"{random.randint(100000, 999999)}"

    otp_log = OTPLog.objects.create(
        phone_number=phone,
        otp_code=otp_code,
        expires_at=timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES),
    )

    service = MetaWhatsAppService()
    result = service.send_otp_message(phone, otp_code)

    if result.get("success"):
        otp_log.message_id = result.get("message_id", "")
        otp_log.status = "sent"
        otp_log.save()
        return {"success": True, "message": "OTP sent successfully"}
    else:
        otp_log.status = "failed"
        otp_log.save()
        return {"success": False, "error": result.get("error", "Failed to send OTP")}


def verify_otp(phone_number, submitted_code):
    """Check a submitted OTP against the most recent one sent to this number."""
    phone = str(phone_number).replace("+", "").strip()

    otp_log = OTPLog.objects.filter(phone_number=phone).order_by('-created_at').first()

    if not otp_log:
        return {"success": False, "error": "No OTP was requested for this number"}

    if otp_log.is_verified:
        return {"success": False, "error": "This OTP has already been used"}

    if timezone.now() > otp_log.expires_at:
        return {"success": False, "error": "OTP has expired, please request a new one"}

    if otp_log.attempts >= MAX_ATTEMPTS:
        return {"success": False, "error": "Too many incorrect attempts, please request a new OTP"}

    if otp_log.otp_code != str(submitted_code).strip():
        otp_log.attempts += 1
        otp_log.save()
        return {"success": False, "error": "Incorrect OTP"}

    otp_log.is_verified = True
    otp_log.save()
    return {"success": True, "message": "OTP verified successfully"}
