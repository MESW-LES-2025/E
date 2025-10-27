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

For detailed instructions and guidelines, refer to the [`README.md`](./backend/README.md) file in the `backend` directory and the [`README.md`](./frontend/README.md) file in the `frontend` directory. These files provide specific information about their respective parts of the application.

## Frameworks and Tools

- Django - A high-level Python web framework. [See Django docs](https://docs.djangoproject.com/en/5.2).
- Next.js - A React-based framework for building web applications. [See Next.js docs](https://nextjs.org/docs).
