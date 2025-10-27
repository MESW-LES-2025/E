# Backend README

Our backend is built using [Django](https://www.djangoproject.com/), a high-level Python web framework that encourages rapid development and clean, pragmatic design.

We also make use of [DRF (Django Rest Framework)](https://www.django-rest-framework.org/), a powerful and flexible Django add-on for building RESTful APIs.

As for the database, we are using [SQLite](https://www.sqlite.org/index.html), a lightweight, disk-based database that allows quick setup and comes bundled with Django by default.

## Setup

1. **Navigate to the backend directory:**

   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**

   ```bash
   python -m venv venv
   # For Linux/MacOS:
   source venv/bin/activate
   # For Windows:
   venv\Scripts\activate
   ```

3. **Install the required dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Apply database migrations\*:**

   ```bash
   python manage.py migrate
   ```

   \*Migrations are used to track and manage changes to the database schema over time. `python manage.py migrate` applies the latest changes to the database.

   When developing, upon making changes to models, generate new migration files using:

   ```
    python manage.py makemigrations
   ```

5. **Start the development server:**

   ```bash
   python manage.py runserver
   ```

6. **(Optional) Discovering the API:**

   With the server running, you can explore the available API endpoints by navigating to `http://localhost:8000/api/`. Make sure `DEBUG` is set to `True` in [`settings.py`](./backend/settings.py) for the browsable API to work.

## Adding library dependencies

Upon adding a new python dependency (doing `pip install <package_name>`) to the project, ensure to update the `requirements.txt` file to reflect these changes. This can be done using the following command:

```bash
pip freeze > requirements.txt
```

while the virtual environment is activated.

For making sure `requirements.txt` is minimal, it is advised to use a virtual environment when working on this project.

## Recommended Tools

Atleast one tool to manage and view the SQLite database is recommended:

[SQLite Viewer VS Code Extension](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer) - View and update SQLite database through VS Code.

[DB Browser for SQLite](https://sqlitebrowser.org) - A high-quality, open-source tool to create, design, and edit database files compatible with SQLite.
