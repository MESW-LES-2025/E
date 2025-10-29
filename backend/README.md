# Backend README

Our backend is built using [Django](https://www.djangoproject.com/), a high-level Python web framework that encourages rapid development and clean, pragmatic design.

We also make use of [DRF (Django Rest Framework)](https://www.django-rest-framework.org/), a powerful and flexible Django add-on for building RESTful APIs.

As for the database, we are using [SQLite](https://www.sqlite.org/index.html), a lightweight, disk-based database that allows quick setup and comes bundled with Django by default.

## Running the Development Server

For setting up the development environment, refer to the main [`README.md`](../README.md#quick-setup) file in the root directory.

To run the development server, follow these steps:

1\. **Navigate to the `backend` directory.**

```bash
cd backend
```

2\. **Activate the virtual environment:**

```bash
# On Windows
.\venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
```

3\. **Apply database migrations\*:**

```bash
python manage.py migrate
```

\*Migrations are used to track and manage changes to the database schema over time. `python manage.py migrate` applies the latest changes to the database.

**⚠️ When developing, upon making changes to models, generate new migration files using:**

```
 python manage.py makemigrations
```

4\. **Start the development server:**

```bash
python manage.py runserver
```

5\. **(Optional) Discovering the API:**

With the server running, you can explore the available API endpoints by navigating to `http://localhost:8000/api/`. Make sure `DEBUG` is set to `True` in [`settings.py`](./backend/settings.py) for the browsable API to work.

## Adding library dependencies

Upon adding a new python dependency (doing `pip install <package_name>`) to the project, ensure you update the `requirements.txt` file to reflect these changes. This can be done using the following command:

```bash
pip freeze > requirements.txt
```

while the virtual environment is activated.

## Available Commands

In the `backend` directory, you can run the following commands:

- `python manage.py runserver`: Starts the Django development server.
- `python manage.py migrate`: Applies database migrations.
- `python manage.py makemigrations`: Creates new migration files based on the changes made to models.
- `black .`: Formats the code using Black.
- `isort .`: Sorts imports using isort.
- `flake8 .`: Checks for code quality issues using Flake8.
- `mypy .`: Performs static type checking using Mypy.
- `pytest`: Runs the available unit tests using Pytest.

## Recommended Tools

Atleast one tool to manage and view the SQLite database is recommended:

[SQLite Viewer VS Code Extension](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer) - View and update SQLite database through VS Code.

[DB Browser for SQLite](https://sqlitebrowser.org) - A high-quality, open-source tool to create, design, and edit database files compatible with SQLite.

## Learn More

To learn more about Django and related technologies, take a look at the following resources:

- [Django Documentation](https://docs.djangoproject.com/en/stable/) - learn about Django features and API.
- [Django Rest Framework Documentation](https://www.django-rest-framework.org/) - understand DRF features, syntax, and best practices.
- [Type Hints in Python](https://www.geeksforgeeks.org/python-type-hints-in-python) - understand how to use type hints to improve code readability and maintainability.
- [Pytest Documentation](https://docs.pytest.org/en/stable/) - learn how to write simple and scalable test cases for Python applications.
