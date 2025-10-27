# Erasmus in Porto

## Repository Structure

```
Root/
├── backend/       # Django backend
├── frontend/      # Next.js frontend
└── README.md      # Project documentation
```

## Quick Setup

### Backend

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

4. **Apply database migrations:**

   ```bash
   python manage.py migrate
   ```

5. **Start the development server:**

   ```bash
   python manage.py runserver
   ```

### Frontend

1. **Navigate to the frontend directory:**

   ```bash
   cd frontend
   ```

2. **Copy `.env.example` to create a `.env` file, ensuring the environment variables are set:**

   ```bash
   cp .env.example .env
   ```

3. **Install the required dependencies:**

   ```bash
   npm install
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

5. **Access the application in your browser:**

   Open [http://localhost:3000](http://localhost:3000).

## Development Guidelines

### Project Structure

For detailed instructions and guidelines, refer to the [`README.md`](./backend/README.md) file in the `backend` directory and the [`README.md`](./frontend/README.md) file in the `frontend` directory. These files provide specific information about their respective parts of the application.

### Git Flow Branching Model

This project follows the **Git Flow workflow**, a structured branching model to manage development, releases, and hotfixes efficiently.

#### Main branches

- **main** → production-ready code; every commit here represents a release.
- **development** → integration branch for new features; serves as the base for upcoming releases.

#### Supporting branches

- **Feature branches** → for developing new features. Branch off from `develop` and merge back when complete.  
  **Branch naming convention:** start with `feature/` (e.g., `feature/login-form`).

- **Release branches** → for preparing a new version. Branch off from `develop`, allow final tweaks/bug fixes, and merge into both `master` and `develop`.  
  **Branch naming convention:** start with `release/` (e.g., `release/1.0.0`).

- **Hotfix branches** → for urgent fixes in production. Branch off from `main` and merge into both `main` and `development`. **Branch naming convention:** start with `hotfix/` (e.g., `hotfix/fix-login-bug`).

To maintain traceability and clarity, always use **descriptive names** for branches and **link to the related issue**.

## Frameworks and Tools

- Django - A high-level Python web framework. [See Django docs](https://docs.djangoproject.com/en/5.2).
- Next.js - A React-based framework for building web applications. [See Next.js docs](https://nextjs.org/docs).
