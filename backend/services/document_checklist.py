from django.core.exceptions import ObjectDoesNotExist


DOCUMENT_MAP = {
    "passport_required": ("passport", "Passport", "Identity documents"),
    "sop_required": ("sop", "Statement of Purpose", "Application documents"),
    "lor_required": ("lor", "Letters of Recommendation", "Application documents"),
    "resume_required": ("resume", "Résumé or CV", "Application documents"),
    "portfolio_required": ("portfolio", "Portfolio", "Application documents"),
    "financial_documents_required": ("financial", "Financial documents", "Financial documents"),
}


def build_document_checklist(courses, profile=None):
    profile = profile or {}
    items = {}
    for course in courses:
        try:
            requirements = course.document_requirement
        except ObjectDoesNotExist:
            continue
        for field, (key, name, category) in DOCUMENT_MAP.items():
            if not getattr(requirements, field):
                continue
            item = items.setdefault(key, {"id": key, "name": name, "category": category, "requirement": "required", "reasons": [], "sources": [], "course_ids": [], "available": False})
            item["course_ids"].append(course.id)
            item["sources"].append({"type": "course", "course_id": course.id, "course": course.title})
            item["reasons"].append(f"Required for {course.title}")
    available = set(profile.get("available_documents") or [])
    for key, item in items.items():
        item["available"] = key in available
    required = len(items); ready = sum(item["available"] for item in items.values())
    status = "ready" if required and ready == required else "partially_ready" if ready else "missing_required_documents" if required else "requirements_unavailable"
    return {"status": status, "required_count": required, "available_count": ready, "missing_documents": [i["name"] for i in items.values() if not i["available"]], "items": list(items.values())}
