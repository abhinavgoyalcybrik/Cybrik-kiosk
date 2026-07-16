import os
from django.conf import settings


def _build_document_entry(country_folder, filename):
    base_url = getattr(settings, 'PUBLIC_BASE_URL', '').rstrip('/')
    if not base_url:
        raise ValueError(
            "PUBLIC_BASE_URL is not set in settings/.env — "
            "Meta needs a public HTTPS URL to fetch documents from."
        )
    return {
        "url": f"{base_url}{settings.MEDIA_URL}{country_folder}/{filename}",
        "filename": filename,
        "caption": filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ').title(),
    }


def get_checklist_document(country_name):
    """
    Stage 1 — returns ONLY the checklist.pdf for a country, as a single-item list.
    Used right after preferences are saved (up to 3 countries).
    """
    country_folder = country_name.strip().lower().replace(" ", "")
    folder_path = os.path.join(settings.MEDIA_ROOT, country_folder)

    checklist_path = os.path.join(folder_path, "checklist.pdf")
    if not os.path.isfile(checklist_path):
        return []

    return [_build_document_entry(country_folder, "checklist.pdf")]


def get_full_documents(country_name):
    """
    Stage 2 — returns every file in the country's folder EXCEPT checklist.pdf.
    Used after the voice agent transcript identifies the student's actual
    country of interest.
    """
    country_folder = country_name.strip().lower().replace(" ", "")
    folder_path = os.path.join(settings.MEDIA_ROOT, country_folder)

    if not os.path.isdir(folder_path):
        return []

    documents = []
    for filename in sorted(os.listdir(folder_path)):
        if filename == "checklist.pdf":
            continue
        file_path = os.path.join(folder_path, filename)
        if os.path.isfile(file_path):
            documents.append(_build_document_entry(country_folder, filename))
    return documents


def get_country_documents(country_name):
    """Kept for backward compatibility — returns everything including checklist."""
    country_folder = country_name.strip().lower().replace(" ", "")
    folder_path = os.path.join(settings.MEDIA_ROOT, country_folder)

    if not os.path.isdir(folder_path):
        return []

    documents = []
    for filename in sorted(os.listdir(folder_path)):
        file_path = os.path.join(folder_path, filename)
        if os.path.isfile(file_path):
            documents.append(_build_document_entry(country_folder, filename))
    return documents