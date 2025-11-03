"""
WSGI config for backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
import sys

from django.core.wsgi import get_wsgi_application

project_path = os.path.dirname(os.path.abspath(__file__))

if project_path not in sys.path:
    sys.path.append(project_path)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

os.system(
    f"cd {project_path} && "
    f"git pull && "
    f"python manage.py migrate --noinput && "
    f"python manage.py collectstatic --noinput"
)

application = get_wsgi_application()
