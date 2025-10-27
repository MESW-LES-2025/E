# Frontend README

Our frontend is built using [Next.js](https://nextjs.org/), a React framework that enables the development of React applications with ease.

We also use [TypeScript](https://www.typescriptlang.org/) to add static typing to our JavaScript code, improving type safety and developer experience.

## Setup

1. **Navigate to the frontend directory:**

   ```bash
   cd frontend
   ```

2. **Copy `.env.example` to create a `.env` file, ensuring the environment variables are set:**

   ```bash
   cp .env.example .env
   ```

3. **(In case it's your first time running the frontend\*)
   Install the required dependencies:**

   ```bash
   npm install
   ```

   \*_After the first time, you can skip this step unless dependencies have been updated/added or if you get an error about missing packages._

4. **Start the development server:**

   ```bash
   npm run dev
   ```

5. **Access the application in your browser:**

   Open [http://localhost:3000](http://localhost:3000).

## Styles and premade components

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

As for reusable components, you can use [Shadcn UI](https://ui.shadcn.com/docs/components), which is a set of prebuilt and prestyled components that you can import and pass properties to.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [TypeScript Documentation](https://www.typescriptlang.org/docs) - understand TypeScript features, syntax, and best practices.
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - explore the utility-first CSS framework used for styling.
- [Shadcn UI Documentation](https://ui.shadcn.com/docs) - learn how to use and customize Shadcn UI components.
