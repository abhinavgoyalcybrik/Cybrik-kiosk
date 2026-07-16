from django.urls import path
from . import views

urlpatterns = [
    path('webhooks/whatsapp/', views.whatsapp_webhook, name='whatsapp_webhook'),
    path('otp/request/', views.request_otp, name='request_otp'),
    path('otp/verify/', views.verify_otp_view, name='verify_otp'),
    path('preferences/submit/', views.submit_preferences, name='submit_preferences'),
    path('voice-agent/transcript/', views.voice_agent_transcript, name='voice_agent_transcript'),
]        