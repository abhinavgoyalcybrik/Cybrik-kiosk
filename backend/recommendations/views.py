from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import json

from services.meta_whatsapp_service import handle_incoming_event, verify_signature, MetaWhatsAppService
from services.otp_service import generate_otp, verify_otp
from services.document_service import get_checklist_document, get_full_documents
from services.crm_service import push_lead_to_crm


@csrf_exempt
def whatsapp_webhook(request):
    if request.method == "GET":
        verify_token = getattr(settings, 'META_WHATSAPP_VERIFY_TOKEN', '')
        if (request.GET.get("hub.mode") == "subscribe" and
                request.GET.get("hub.verify_token") == verify_token):
            return HttpResponse(request.GET.get("hub.challenge"), status=200)
        return HttpResponse("Verification failed", status=403)

    elif request.method == "POST":
        if not verify_signature(request):
            return HttpResponse("Invalid signature", status=403)
        data = json.loads(request.body)
        handle_incoming_event(data)
        return JsonResponse({"status": "ok"}, status=200)


@csrf_exempt
def request_otp(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    phone_number = data.get("phone_number")
    if not phone_number:
        return JsonResponse({"error": "phone_number is required"}, status=400)

    result = generate_otp(phone_number)
    return JsonResponse(result, status=200 if result.get("success") else 400)


@csrf_exempt
def verify_otp_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    phone_number = data.get("phone_number")
    otp_code = data.get("otp_code")
    if not phone_number or not otp_code:
        return JsonResponse({"error": "phone_number and otp_code are required"}, status=400)

    result = verify_otp(phone_number, otp_code)
    return JsonResponse(result, status=200 if result.get("success") else 400)


@csrf_exempt
def submit_preferences(request):
    """
    STAGE 1 — call this right after the student saves their preferences
    (up to 3 selected countries). Sends the lightweight checklist.pdf
    for each selected country, then pushes the lead to the CRM.

    Expected JSON body:
    {
        "session_id": "abc123",
        "phone_number": "919876543210",
        "countries": ["Australia", "Canada"],   # up to 3
        "student_data": {"name": "...", "email": "..."}   # optional
    }
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    session_id = data.get("session_id")
    phone_number = data.get("phone_number")
    countries = data.get("countries", [])
    student_data = data.get("student_data", {})

    if not phone_number or not countries:
        return JsonResponse({"error": "phone_number and countries are required"}, status=400)
    if len(countries) > 3:
        return JsonResponse({"error": "Maximum 3 countries allowed"}, status=400)

    service = MetaWhatsAppService()
    checklist_results = []

    for country in countries:
        service.send_checklist_message(phone_number, country)
        docs = get_checklist_document(country)
        if docs:
            result = service.send_multiple_documents(phone_number, docs, country_name=country)
            checklist_results.append({"country": country, "result": result})
        else:
            checklist_results.append({"country": country, "result": {"success": False, "error": "checklist.pdf not found"}})

    crm_result = push_lead_to_crm(session_id, phone_number, countries, student_data)

    return JsonResponse({
        "checklist_results": checklist_results,
        "crm_result": crm_result
    }, status=200)


@csrf_exempt
def voice_agent_transcript(request):
    """
    STAGE 2 — called by the CRM/voice agent once a call finishes and the
    transcript has identified the ONE country the student is actually
    interested in. Sends the full document set (SOP, LOR, etc.) for
    that country only.

    Expected JSON body:
    {
        "phone_number": "919876543210",
        "country": "Australia"
    }
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    phone_number = data.get("phone_number")
    country = data.get("country")
    if not phone_number or not country:
        return JsonResponse({"error": "phone_number and country are required"}, status=400)

    docs = get_full_documents(country)
    if not docs:
        return JsonResponse({"error": f"No full documents found for '{country}'"}, status=404)

    service = MetaWhatsAppService()
    result = service.send_multiple_documents(phone_number, docs, country_name=country)

    return JsonResponse(result, status=200)