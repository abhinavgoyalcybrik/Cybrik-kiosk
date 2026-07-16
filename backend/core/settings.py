"""
Django settings for core project.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-d^&o#)on_9bj8@2qt)bnk@=&*y5aie0)xkuz0(^azw$qiba^gu")

DEBUG = os.getenv("DEBUG", "True") == "True"

ALLOWED_HOSTS = [
    "127.0.0.1",
    "localhost",
    "192.168.1.64",
    "192.168.1.86",
    "nimbly-acuteness-zips.ngrok-free.dev",
    "10.213.179.88",
    "192.168.1.96",
    "magical-advertising-genealogy-sci.trycloudflare.com",
    "192.168.1.105",
    "unexpired-bronzing-shredding.ngrok-free.dev"
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'api',
    'recommendations',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://nimbly-acuteness-zips.ngrok-free.dev',
    'http://10.213.179.88',
    'http://192.168.1.105'
]

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://nimbly-acuteness-zips.ngrok-free.dev',
    'http://10.213.179.88',
    "http://192.168.1.86",
    "http://192.168.1.105",
    'https://unexpired-bronzing-shredding.ngrok-free.dev'
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'

# ── External Services ─────────────────────────────────────────────────────────

# CRM webhook endpoint used for WhatsApp lead forwarding
CRM_WEBHOOK_URL = os.getenv("CRM_WEBHOOK_URL", "")

# Twilio WhatsApp OTP (real mode — baad mein)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "")

# Crawler settings
CRAWLER_CORRECTION_ENDPOINT = os.getenv("CRAWLER_CORRECTION_ENDPOINT", "local")
CRAWLER_SOURCE_ROOT = os.getenv(
    "CRAWLER_SOURCE_ROOT",
    "/Users/abhinavgoyal9729/Crawl4ai/crawl4ai/university_scraper",
)
CRAWLER_LOCAL_PYTHON = os.getenv(
    "CRAWLER_LOCAL_PYTHON",
    "/Users/abhinavgoyal9729/Crawl4ai/crawl4ai/university_scraper/.venv/bin/python",
)

# ═══════════════════════════════════════════════════════════════════════════════
# META WHATSAPP CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

META_WHATSAPP_PHONE_NUMBER_ID = os.getenv("META_WHATSAPP_PHONE_NUMBER_ID", "YOUR_PHONE_NUMBER_ID")
META_WHATSAPP_ACCESS_TOKEN = os.getenv("META_WHATSAPP_ACCESS_TOKEN", "YOUR_ACCESS_TOKEN")
META_WHATSAPP_BUSINESS_ACCOUNT_ID = os.getenv("META_WHATSAPP_BUSINESS_ACCOUNT_ID", "YOUR_BUSINESS_ACCOUNT_ID")

# FIX: was graph.instagram.com (Instagram API, not WhatsApp) and was not reading from .env
META_WHATSAPP_API_ENDPOINT = os.getenv("META_WHATSAPP_API_ENDPOINT", "https://graph.facebook.com/v20.0")

# ADDED: needed for the webhook GET verification handshake with Meta
META_WHATSAPP_VERIFY_TOKEN = os.getenv("META_WHATSAPP_VERIFY_TOKEN", "")

# ═══════════════════════════════════════════════════════════════════════════════
# DOCUMENT DELIVERY (WhatsApp document sending)
# ═══════════════════════════════════════════════════════════════════════════════

# Local folder holding country-wise documents, e.g. backend/documents/australia/
MEDIA_URL = '/documents/'
MEDIA_ROOT = BASE_DIR / 'documents'

# Public HTTPS URL Meta can reach to download document files from.
# Must be your current ngrok/production URL — update whenever ngrok restarts.
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "")

# App Secret (from Meta App Settings > Basic) — used to verify that incoming
# webhook POSTs genuinely came from Meta, not a spoofed request.
META_APP_SECRET = os.getenv("META_APP_SECRET", "")

print(f"🔍 DEBUG - PUBLIC_BASE_URL loaded as: {repr(PUBLIC_BASE_URL)}")