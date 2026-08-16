# Contributing Guidelines

First of all, thank you for showing interest in contributing to **PAWnic**!

## Codebase Integrity Rules

> [!IMPORTANT]
> The primary codebase files (located in `app/`, `components/`, `lib/`, `hooks/`, and `middleware.ts`) contain core real-time game rules, wallet signing paths, and payment validations. Ensure any modifications are covered by extensive manual testing and, where possible, do not alter stable core UI layouts or state transitions unless discussed in issues beforehand.

## Local Development Setup

To contribute to this repository:

1. **Fork and Clone**: Fork the repository on GitHub, then clone your fork locally.
2. **Setup Dependencies**: Make sure you have Node.js v20+ installed. Install the package dependencies using:
   ```bash
   npm install
   ```
3. **Configure Database**: Create a Supabase project and execute the SQL statements in [`supabase_schema.sql`](supabase_schema.sql) using the Supabase SQL editor.
4. **Environment Configuration**: Copy `.env.example` to `.env` and fill in your keys:
   * `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase API endpoint.
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key.
   * `NEXT_PUBLIC_STELLAR_VAULT_PUBLIC_KEY`: Stellar public key for room escrow/deposits.
   * `STELLAR_VAULT_SECRET_KEY`: Stellar secret key used by server actions for payouts.
5. **Run Locally**:
   ```bash
   npm run dev
   ```

## Development Workflow

1. **Create a branch**: Use clear naming conventions like `feature/your-feature-name` or `bugfix/your-fix-name`.
2. **Formatting**: Ensure your code meets formatting rules defined in `.editorconfig`.
3. **Linting**: Run `npm run lint` before committing to verify your changes align with ESLint rules.
4. **Type Check**: Verify types compile without error by running `npx tsc --noEmit`.
5. **PR Checklist**: When creating a pull request, please complete the pull request template details and reference any related open issues.
