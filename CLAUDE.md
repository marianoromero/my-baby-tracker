# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`
- **Type checking**: `npm run check`
- **Type checking (watch mode)**: `npm run check:watch`

## Architecture Overview

### Technology Stack
- **Frontend**: SvelteKit with TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Deployment**: GitHub Pages with static adapter
- **Styling**: CSS with custom properties

### Core Structure

**Database Schema** (Supabase):
- `families` - Family groups with invitation codes
- `family_members` - Links users to families
- `subjects` - Tracked individuals (Baby, Partner, etc.)
- `actions` - Available action types per subject
- `events` - Logged activities with timestamps

**State Management** (Svelte stores):
- `src/lib/stores/auth.js` - Authentication (Google OAuth, email/password)
- `src/lib/stores/family.js` - Family initialization, subjects, and actions
- `src/lib/stores/events.js` - Event logging with real-time updates and filtering

**Key Components**:
- `src/lib/components/Timeline.svelte` - Event display component
- Route-based pages in `src/routes/` for dashboard, timeline, auth

### Authentication Flow
Users can sign up with invitation codes to join existing families or create new ones automatically. Google OAuth and email/password are supported. The app handles session persistence and automatic redirects.

### Event System
Events are logged against subjects with timestamps. Real-time updates use Supabase subscriptions. Events can be filtered by time periods (today, yesterday, week, month, all) and are grouped by date for display.

### Deployment Configuration
The app is configured for GitHub Pages deployment with the static adapter. Production builds use the `/my-baby-tracker` base path defined in `svelte.config.js`.