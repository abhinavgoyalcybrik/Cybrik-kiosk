import requests
import logging
import hmac
import hashlib
from django.conf import settings

logger = logging.getLogger(__name__)


def verify_signature(request):
    """
    Verify that an incoming webhook POST genuinely came from Meta,
    using the X-Hub-Signature-256 header and your app secret.
    Returns True if valid (or if META_APP_SECRET isn't configured yet,
    to avoid blocking local testing before you've set it up).
    """
    app_secret = getattr(settings, 'META_APP_SECRET', '')
    if not app_secret:
        logger.warning("META_APP_SECRET not set — skipping webhook signature check")
        return True

    signature = request.headers.get('X-Hub-Signature-256', '')
    if not signature.startswith('sha256='):
        return False

    expected_sig = signature.split('sha256=')[-1]
    computed_hmac = hmac.new(
        app_secret.encode('utf-8'),
        msg=request.body,
        digestmod=hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(computed_hmac, expected_sig)


class MetaWhatsAppService:
    """Handle all Meta WhatsApp API calls for OTP and Document sending"""

    def __init__(self):
        self.phone_number_id = getattr(settings, 'META_WHATSAPP_PHONE_NUMBER_ID', '')
        self.access_token = getattr(settings, 'META_WHATSAPP_ACCESS_TOKEN', '')
        # FIX: was graph.instagram.com — that is the Instagram API, not WhatsApp.
        self.api_endpoint = getattr(settings, 'META_WHATSAPP_API_ENDPOINT', 'https://graph.facebook.com/v20.0')
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        if not self.phone_number_id or not self.access_token:
            logger.warning("Meta WhatsApp credentials not configured in settings")

    def _extract_error(self, response):
        """Safely pull an error message even if the response isn't valid JSON"""
        try:
            return response.json().get('error', {}).get('message', response.text)
        except ValueError:
            return response.text or "Unknown error"

    def send_text_message(self, phone_number, message):
        """Send text message via Meta WhatsApp"""
        try:
            phone = str(phone_number).replace("+", "").strip()

            payload = {
                "messaging_product": "whatsapp",
                "to": phone,
                "type": "text",
                "text": {
                    "body": message
                }
            }

            url = f"{self.api_endpoint}/{self.phone_number_id}/messages"

            response = requests.post(url, json=payload, headers=self.headers, timeout=10)

            if response.status_code in [200, 201]:
                data = response.json()
                message_id = data.get('messages', [{}])[0].get('id', '')
                logger.info(f"Message sent to {phone}: {message_id}")
                return {
                    "success": True,
                    "message_id": message_id,
                    "message": "Text message sent successfully"
                }
            else:
                error_msg = self._extract_error(response)
                logger.error(f"Failed to send message: {error_msg}")
                return {"success": False, "error": error_msg}

        except Exception as e:
            logger.error(f"Error sending text message: {str(e)}")
            return {"success": False, "error": str(e)}

    def send_otp_message(self, phone_number, otp_code):
        """Send OTP via Meta WhatsApp using the approved 'otp_verification' Authentication template"""
        try:
            phone = str(phone_number).replace("+", "").strip()

            payload = {
                "messaging_product": "whatsapp",
                "to": phone,
                "type": "template",
                "template": {
                    "name": "otp_verification",
                    "language": {"code": "en"},
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": otp_code}
                            ]
                        },
                        {
                            "type": "button",
                            "sub_type": "url",
                            "index": "0",
                            "parameters": [
                                {"type": "text", "text": otp_code}
                            ]
                        }
                    ]
                }
            }

            url = f"{self.api_endpoint}/{self.phone_number_id}/messages"
            response = requests.post(url, json=payload, headers=self.headers, timeout=10)

            if response.status_code in [200, 201]:
                data = response.json()
                message_id = data.get('messages', [{}])[0].get('id', '')
                logger.info(f"OTP template sent to {phone}: {message_id}")
                return {
                    "success": True,
                    "message_id": message_id,
                    "message": "OTP sent successfully"
                }
            else:
                error_msg = self._extract_error(response)
                logger.error(f"Failed to send OTP template: {error_msg}")
                return {"success": False, "error": error_msg}

        except Exception as e:
            logger.error(f"Error sending OTP: {str(e)}")
            return {"success": False, "error": str(e)}

    def send_document(self, phone_number, document_url, file_name="", caption="", country_name=""):
        """
        Send document/PDF via Meta WhatsApp using the approved 'document_delivery'
        Utility template (document header). Free-form document messages only
        deliver within the 24h customer service window, which this kiosk flow
        never opens, so documents must go out as a template instead.
        """
        from recommendations.models import MessageLog

        phone = str(phone_number).replace("+", "").strip()
        try:
            payload = {
                "messaging_product": "whatsapp",
                "to": phone,
                "type": "template",
                "template": {
                    "name": "document_delivery",
                    "language": {"code": "en"},
                    "components": [
                        {
                            "type": "header",
                            "parameters": [
                                {
                                    "type": "document",
                                    "document": {
                                        "link": document_url,
                                        "filename": file_name,
                                    },
                                }
                            ],
                        },
                        {
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": caption or file_name},
                                {"type": "text", "text": country_name},
                            ],
                        },
                    ],
                },
            }

            url = f"{self.api_endpoint}/{self.phone_number_id}/messages"

            response = requests.post(url, json=payload, headers=self.headers, timeout=10)

            if response.status_code in [200, 201]:
                data = response.json()
                message_id = data.get('messages', [{}])[0].get('id', '')
                logger.info(f"Document sent to {phone}: {file_name} ({message_id})")
                MessageLog.objects.create(
                    phone_number=phone, message_id=message_id, message_type='document',
                    file_name=file_name, status='sent',
                )
                return {
                    "success": True,
                    "message_id": message_id,
                    "file_name": file_name,
                    "message": "Document sent successfully"
                }
            else:
                error_msg = self._extract_error(response)
                logger.error(f"Failed to send document: {error_msg}")
                MessageLog.objects.create(
                    phone_number=phone, message_type='document',
                    file_name=file_name, status='failed', error=error_msg,
                )
                return {"success": False, "error": error_msg}

        except Exception as e:
            logger.error(f"Error sending document: {str(e)}")
            MessageLog.objects.create(
                phone_number=phone, message_type='document',
                file_name=file_name, status='failed', error=str(e),
            )
            return {"success": False, "error": str(e)}

    def send_multiple_documents(self, phone_number, documents_list, country_name=""):
        """
        Send multiple documents in sequence

        documents_list = [
            {"url": "https://...", "filename": "checklist.pdf", "caption": "Checklist"},
            {"url": "https://...", "filename": "lor.docx", "caption": "LOR Template"},
        ]
        """
        results = []
        for doc in documents_list:
            result = self.send_document(
                phone_number=phone_number,
                document_url=doc.get('url'),
                file_name=doc.get('filename', ''),
                caption=doc.get('caption', ''),
                country_name=country_name,
            )
            results.append(result)

        success_count = sum(1 for r in results if r.get('success'))
        return {
            "total_documents": len(documents_list),
            "sent_successfully": success_count,
            "failed": len(documents_list) - success_count,
            "results": results
        }

    def send_checklist_message(self, phone_number, country_name):
        """Send country checklist requirements message"""
        try:
            phone = str(phone_number).replace("+", "").strip()

            message = f"""Documents required for {country_name} student visa

Hello!

Here are the key documents you'll need for your {country_name} student visa application:

Essential documents:
- Valid passport
- Admission letter from institution
- Proof of financial support
- Language test score (IELTS/TOEFL/PTE)

Academic documents:
- High school and college certificates
- Academic transcripts
- Degree certificate (if applicable)

Important:
- Statement of purpose (SOP)
- Letter of recommendation (LOR)
- Medical certificate
- Police clearance (if required)

We're sending you the complete checklist and templates. Please review them carefully.

If you have any questions, feel free to reach out.

Powered by Cybrik Edugraph"""

            return self.send_text_message(phone_number, message)

        except Exception as e:
            logger.error(f"Error sending checklist message: {str(e)}")
            return {"success": False, "error": str(e)}

    def verify_webhook(self, token, verify_token):
        """Verify webhook token from Meta during the GET handshake"""
        return token == verify_token


def handle_incoming_event(data):
    """
    Parse an incoming POST payload from Meta's WhatsApp webhook.
    Called from recommendations/views.py whenever Meta sends an event
    (message delivered/read/failed, or an incoming reply from the student).
    """
    # Imported here (not at top of file) to avoid circular imports between
    # services/ and the recommendations app.
    from recommendations.models import OTPLog, MessageLog

    try:
        entry = data.get("entry", [])
        if not entry:
            return

        changes = entry[0].get("changes", [])
        if not changes:
            return

        value = changes[0].get("value", {})

        # Case 1: delivery/read/failed status update for a message we sent
        if "statuses" in value:
            status_info = value["statuses"][0]
            message_id = status_info.get("id")
            phone = status_info.get("recipient_id")
            status = status_info.get("status")  # sent, delivered, read, failed
            errors = status_info.get("errors")
            logger.info(f"WhatsApp status update: {phone} -> {status} (message_id={message_id})")

            # Match on message_id so a document's delivery status can't overwrite
            # an unrelated OTP log for the same phone number.
            updated = OTPLog.objects.filter(message_id=message_id).update(status=status) if message_id else 0
            if not updated and message_id:
                msg_log = MessageLog.objects.filter(message_id=message_id).first()
                if msg_log:
                    msg_log.status = status
                    if errors:
                        msg_log.error = str(errors)
                    msg_log.save()

        # Case 2: incoming message/reply from the student
        if "messages" in value:
            msg = value["messages"][0]
            phone = msg.get("from")
            text = msg.get("text", {}).get("body", "")
            logger.info(f"WhatsApp incoming message from {phone}: {text}")
            # TODO: route this to conversation/CRM handling
            # (e.g. detect "checklist" keyword and trigger send_checklist_message)

    except (KeyError, IndexError, TypeError) as e:
        logger.error(f"Error parsing incoming WhatsApp webhook event: {str(e)}")