# Deployment Branch

This branch is used to host the built versions of the Next.js application for both `staging` and `production` environments.

## Accessing the Application

The application is served via GitHub Pages and can be accessed at the following URLs:

- **Staging**: [https://mesw-les-2025.github.io/E/staging/](https://mesw-les-2025.github.io/E/staging/)
- **Production**: [https://mesw-les-2025.github.io/E/production/](https://mesw-les-2025.github.io/E/production/)


## Structure

The branch is organized as follows:

```
deployment/
├── staging/       # Build output for the staging environment
└── production/    # Build output for the production environment
```

- **`staging/`**: Contains the updated Next.js build for the `development` branch.
- **`production/`**: Contains the updated Next.js build for the `main` branch.

This separation ensures that testing and development do not interfere with the live application.

## Deployment Workflow

The frontend deployment process is automated using GitHub Actions, as defined in the [`frontend.yml`](../.github/workflows/frontend.yml) workflow file. The process is triggered by commits to the `main` or `development` branches.

As for backend deployment, we automate [PythonAnywhere](https://www.pythonanywhere.com/) reloads using GitHub Actions jobs for `staging` and `production` deployments. Those use GitHub Secrets environment variables to configure the PythonAnywhere API url and token for authentication.

For more details, refer to this repository's [README](https://github.com/MESW-LES-2025/E) section on Continuous Deployment (CD).
