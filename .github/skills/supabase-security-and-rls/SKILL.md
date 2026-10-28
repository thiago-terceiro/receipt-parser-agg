---
name: supabase-security-and-rls
description: >-
  Audits, hardens, and optimizes Supabase PostgreSQL Row-Level Security (RLS), multi-tenant isolation, 
  RPC functions, and index performance for the receipt-parser-agg codebase. Use when adding or modifying 
  database tables, authoring SQL migrations, reviewing query latency, or securing user-scoped database access.
---

# Supabase Security & RLS Runbook

This skill guides the auditing, implementation, and performance optimization of PostgreSQL database schemas, Row-Level Security (RLS) policies, and RPC stored procedures within this project's Supabase backend.

## Architecture & Tenancy Model

The application uses a multi-tenant shared board architecture:
- **`profiles`**: User identities (linked with NextAuth credentials and OAuth).
- **`user_credentials`**: Stores salted password hashes. Must **NEVER** have permissive RLS policies; accessible strictly by server-side authentication routines.
- **`boards`**: Top-level containers for receipts and grocery entries.
- **`board_members`**: Join table establishing role-based permissions (`owner`, `editor`, `viewer`).
- **`board_invites`**: Secure token-hashed invitations with expiry.
- **`receipts`**: Parsed OCR receipts bound to a `board_id`.
- **`grocery_entries`**: Individual line items categorized and bound to a `board_id`.

## Security Checklist & Hardening Rules

### 1. Row-Level Security (RLS) Baseline
- **Every table must have RLS enabled**:
  ```sql
  alter table public.<table_name> enable row level security;
  alter table public.<table_name> force row level security;
  ```
- **Zero permissive access to sensitive tables**:
  `public.user_credentials` must have RLS enabled with **no policies** granted to `anon` or `authenticated`. All access must go through `service_role` via [`lib/auth-db.ts`](file:///c:/Users/thiag/Documents/projects/antigravity/receipt-parser-agg/lib/auth-db.ts).

### 2. Guarding `SECURITY DEFINER` Functions
Any stored procedure with `security definer` bypasses RLS and runs with owner privileges. You must strictly enforce:
- **Set immutable `search_path`**:
  ```sql
  create or replace function public.<function_name>(...)
  returns ...
  language plpgsql
  security definer
  set search_path = public, pg_temp
  as $$ ... $$;
  ```
  *Why*: Without an explicit `search_path`, malicious users can create tables or operators in temporary schemas (`pg_temp`) that hijack function execution.
- **Revoke default public permissions**:
  PostgreSQL grants execute permissions to `public` by default on newly created functions. Always revoke and grant strictly to `service_role`:
  ```sql
  revoke execute on function public.<function_name>(...) from public, anon, authenticated;
  grant execute on function public.<function_name>(...) to service_role;
  ```

### 3. Client Scoping & Identity Propagation
In [`lib/supabase-server.ts`](file:///c:/Users/thiag/Documents/projects/antigravity/receipt-parser-agg/lib/supabase-server.ts):
- Always prefer `getScopedSupabaseServerClient(session)` over the raw unscoped client when executing user-initiated actions.
- The scoped client automatically signs a short-lived user JWT with `sub: userId` and passes `X-App-User-Id` headers so Supabase RLS and RPCs attribute the action to the authenticated user.
- Cached scoped clients are validated against token expiration (`expiresAt > Date.now() + 60_000`) to prevent token expiration during batch operations.

---

## Query & RLS Performance Optimization

### 1. High-Performance RLS Policies (Avoiding RLS Scans Overhead)
RLS policies execute on **every single candidate row**. Poorly written policies destroy query performance.
- **Anti-Pattern (Correlated Subquery)**:
  ```sql
  -- SLOW: Scans board_members repeatedly for every single item
  create policy "Members can view entries" on public.grocery_entries
  for select using (
    board_id in (select board_id from public.board_members where user_id = auth.uid())
  );
  ```
- **Optimized Pattern (`EXISTS` with indexed lookup)**:
  ```sql
  -- FAST: Short-circuits on first matching index hit
  create policy "Members can view entries" on public.grocery_entries
  for select using (
    exists (
      select 1 from public.board_members bm
      where bm.board_id = grocery_entries.board_id
        and bm.user_id = auth.uid()
        and bm.status = 'active'
    )
  );
  ```

### 2. Mandatory Indexes for Multi-Tenant Filtering
Every table partitioned logically by `board_id` or `user_id` must have targeted composite indexes:
- `grocery_entries`: `(board_id, created_at DESC)` and `(board_id, category)`
- `receipts`: `(board_id, created_at DESC)`
- `board_members`: `(board_id, user_id)` (Unique constraint / primary index)
- `board_invites`: `(invite_token_hash)` where `status = 'pending'`
- `profiles`: `(lower(email))` for case-insensitive lookup

---

## Verification & Deployment Procedure

1. **Pre-flight Schema Linting**:
   ```bash
   pnpm run db:lint
   ```
2. **Dry Run Migration Diff**:
   ```bash
   pnpm run db:check
   ```
3. **Verify App Integration Tests**:
   Ensure all database mock and integration tests pass:
   ```bash
   pnpm test lib/supabase-server.test.ts
   pnpm test lib/boards-server.test.ts
   pnpm test lib/groceries-server.test.ts
   ```
4. **Deploy Migration**:
   ```bash
   pnpm run db:deploy
   ```
