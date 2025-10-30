# Erasmus in Porto

This project is designed to facilitate the Erasmus experience in Porto, providing a platform for students to connect and participate in events.

The application consists of a Django backend and a Next.js frontend, providing a user friendly web application.

# Repository Structure

```
Root/
├── .github/       # GitHub Actions workflows
├── .husky/        # Pre-commit hooks
├── backend/       # Django backend
│   └── README.md       # Backend-specific documentation
├── frontend/      # Next.js frontend
│   └── README.md       # Frontend-specific documentation
├── README.md      # Project documentation (you are here)
└── setup.sh       # Setup script for Unix-based systems
└── setup.ps1      # Setup script for Windows PowerShell
```

# Quick Setup

To set up the development environment quickly, run the provided setup script appropriate for your operating system:

- For Windows (PowerShell): [`\setup.ps1`](./setup.ps1)
- For Unix-based systems (Bash): [`./setup.sh`](./setup.sh)

This script should **only be run the first time** you set up the project.

# Development Guidelines

## Project Structure

For detailed instructions and guidelines, refer to the [`README.md`](./backend/README.md) file in the [`backend`](./backend) directory and the [`README.md`](./frontend/README.md) file in the [`frontend`](./frontend) directory. These files provide specific information about their respective parts of the application.

## Git Flow Branching Model

This project follows the **Git Flow workflow**, a structured branching model to manage development, releases, and hotfixes efficiently.

### Main branches

- **main** → production-ready code; every commit here represents a release.
- **development** → integration branch for new features; serves as the base for upcoming releases.

### Supporting branches

- **Feature/Task branches** → for developing new features/tasks. Branch off from `development` and merge back when complete.  
  **Branch naming convention:** start with `feature/` or `task/` (e.g., `feature/login-form`).

- **Release branches** → for preparing a new version. Branch off from `development`, allow final tweaks/bug fixes, and merge into both `main` and `development`.  
  **Branch naming convention:** start with `release/` (e.g., `release/1.0.0`).

- **Hotfix branches** → for urgent fixes in production. Branch off from `main` and merge into both `main` and `development`. **Branch naming convention:** start with `hotfix/` (e.g., `hotfix/fix-login-bug`).

To maintain traceability and clarity, always use **descriptive names** for branches and **link to the related issue**.

## Pre-commit Hooks (CI)

Pre-commit hooks are used in this project to ensure code quality and consistency before changes are committed to the repository.

Although hooks are useful for maintaining code standards, it's important to understand that you may be required to address issues they raise before being allowed to commit your changes.

Hooks can be bypassed if absolutely necessary using:

```bash
git commit --no-verify
```

This project uses the following hooks:

- **Frontend**: Linting and formatting are handled using `eslint` and `prettier`. These are configured to run automatically on staged files via `lint-staged`.
- **Backend**: Python code is checked using `black`, `isort`, `flake8`, and `mypy` through `pre-commit`.

Once installed during [`Quick Setup`](#quick-setup), the hooks will automatically run before each commit for each staged file. If any issues are detected, the commit will be blocked until they are resolved.

The hooks are configured in the [`.husky/`](./.husky) directory and in the configuration files for [`lint-staged`](./frontend/package.json) and [`pre-commit`](./backend/.pre-commit-config.yaml), for both frontend and backend, respectively.

Learn more about [git hooks.](https://git-scm.com/book/ms/v2/Customizing-Git-Git-Hooks)

## GitHub Actions and Workflows (CI)

This project utilizes GitHub Actions to automate various tasks, including running tests and ensuring code quality through Continuous Integration (CI).

The CI workflows are defined in the [`.github/workflows/`](./.github/workflows) directory and are triggered on specific events, such as updates to the `main` and `development` branches or when pull requests are created or updated.

The workflows are configured in the following locations:

```
.github/
└── workflows/
    ├── backend-workflow.yml
    └── frontend-workflow.yml
```

Learn more about [GitHub Actions](https://docs.github.com/en/actions).

# Frameworks and Tools

- Django - A high-level Python web framework. [See Django docs](https://docs.djangoproject.com/en/5.2).
- Next.js - A React-based framework for building web applications. [See Next.js docs](https://nextjs.org/docs).
