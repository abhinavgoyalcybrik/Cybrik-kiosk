"""
URL configuration for core project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('recommendations/', include('recommendations.urls')),
]

# Serve backend/documents/<country>/<file> at https://yourdomain/documents/<country>/<file>
# Only works in DEBUG mode — production needs proper static file hosting (S3, nginx, etc.)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)