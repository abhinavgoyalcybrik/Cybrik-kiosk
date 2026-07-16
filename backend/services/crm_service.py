import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def push_lead_to_crm(session_id, phone_number, countries, student_data=None):
    """
    Push a lead to the CRM once a student has completed preferences.
    countries: list of up to 3 country names the student selected.
    student_data: optional dict with additional profile fields (name, email, etc.)
    """
    crm_url = getattr(settings, 'CRM_WEBHOOK_URL', '')
    if not crm_url:
        logger.warning("CRM_WEBHOOK_URL not configured — skipping CRM push")
        return {"success": False, "error": "CRM_WEBHOOK_URL not configured"}

    payload = {
        "session_id": session_id,
        "phone_number": phone_number,
        "countries_of_interest": countries,
        "student_data": student_data or {},
    }

    try:
        response = requests.post(crm_url, json=payload, timeout=10)
        if response.status_code in [200, 201]:
            logger.info(f"Lead pushed to CRM for session {session_id}")
            return {"success": True, "message": "Lead pushed to CRM"}
        else:
            logger.error(f"CRM push failed: {response.status_code} {response.text}")
            return {"success": False, "error": response.text}
    except Exception as e:
        logger.error(f"Error pushing lead to CRM: {str(e)}")
        return {"success": False, "error": str(e)}