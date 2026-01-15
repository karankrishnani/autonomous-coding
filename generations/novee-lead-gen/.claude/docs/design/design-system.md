# Novee Design System

## Overview
Novee uses a clean, professional SaaS aesthetic focused on clarity and efficiency. The design prioritizes information density without feeling cluttered, with a minimal white background and subtle gray accents.

## Color Palette

### Web App (Light Theme)
- **Primary**: `#2563EB` (Blue) - CTAs, primary buttons, links, active states
- **Primary Dark**: `#1E40AF` (Darker Blue) - Secondary action buttons (e.g., "Not Now")
- **Secondary**: `#10B981` (Green) - Success states, connected status
- **Accent**: `#F59E0B` (Amber) - Warnings, pending states
- **Background**: `#FFFFFF` - Page background
- **Surface**: `#F8FAFC` - Cards, header bar, elevated surfaces
- **Text Primary**: `#111827` - Headings, labels
- **Text Secondary**: `#6B7280` - Descriptions, metadata, timestamps
- **Text Muted**: `#9CA3AF` - Placeholder text
- **Border**: `#E5E7EB` - Input borders, card borders, dividers
- **Border Focus**: `#2563EB` - Input focus ring

### Desktop App
- **Header Gradient**: Purple/Violet gradient (`#7C3AED` to `#4F46E5`)
- **Window Background**: `#FFFFFF`
- **Logo Icon**: Light blue circular icon with "O" shape

### Dark Theme (Future)
- **Primary**: `#60A5FA` (Lighter Blue)
- **Secondary**: `#34D399` (Lighter Green)
- **Background**: `#111827`
- **Surface**: `#1F2937`
- **Text Primary**: `#F9FAFB`
- **Border**: `#374151`

## Typography
- **Font**: Inter (primary), system-ui (fallback)
- **Logo**: "NOVEE" - uppercase, font-bold, tracking-wide
- **Page Title (h1)**: 30px / font-bold / text-gray-900 (e.g., "Leads")
- **Section Title (h2)**: 24px / font-semibold / text-gray-900
- **Card Title**: 18px / font-semibold / text-gray-900
- **Body**: 16px / font-normal / leading-relaxed / text-gray-700
- **Small/Meta**: 14px / font-normal / text-gray-500
- **Caption**: 12px / font-normal / text-gray-400

## Components

### Header Bar
See mockup: `.claude/docs/design/mockups/01-login.png`

- **Height**: 64px
- **Background**: `#FFFFFF` with subtle bottom border
- **Logo**: Left-aligned, light blue icon + "NOVEE" text
- **User Menu**: Right-aligned avatar/initials circle

### Login Form
See mockup: `.claude/docs/design/mockups/01-login.png`

- **Container**: Centered, max-width 400px
- **Title**: "Welcome back" - 24px font-semibold
- **Inputs**: Full width, 48px height, rounded-lg, border-gray-300
- **Labels**: Above inputs, font-medium text-gray-700
- **Primary Button**: Full width, bg-blue-600, text-white, rounded-full, py-3
- **Google Button**: Full width, bg-gray-100, text-gray-700, rounded-full, with Google icon
- **Links**: text-blue-600, font-medium

### Lead Cards
See mockup: `.claude/docs/design/mockups/05-lead-feed.png`

- **Layout**: Single column, full width
- **Padding**: 24px (p-6)
- **Border**: 1px solid border-gray-200
- **Radius**: 12px (rounded-xl)
- **Shadow**: None by default, subtle on hover

**Anatomy:**
- **Status Badge**: "New" pill - bg-blue-100 text-blue-700, rounded-full, px-3 py-1
- **Metadata Row**: "from Slack · 2 hours ago · by Josh Levine" - text-sm text-gray-500
- **Title**: font-semibold text-lg text-gray-900
- **Author**: text-sm text-gray-600
- **Content**: text-base text-gray-700, line-clamp-3
- **Keyword Pills**: Row of pills at bottom (gray bg, rounded-full)
- **Actions**: 3 buttons inline
  - "Open on Slack/LinkedIn" - bg-blue-600 text-white rounded-full px-4 py-2
  - "Not Now" - bg-blue-900 text-white rounded-full px-4 py-2
  - "Not Interested" - border border-gray-300 text-gray-700 rounded-full px-4 py-2
- **Show More Link**: text-blue-600, right-aligned

### Tab Navigation
See mockup: `.claude/docs/design/mockups/05-lead-feed.png`

- **Style**: Text tabs with counts
- **Active**: text-blue-600, font-medium, with count badge (bg-blue-100)
- **Inactive**: text-gray-500
- **Count Badge**: Inline with tab name, e.g., "Newest 10"

### Filter Dropdowns
- **Style**: Outlined select, rounded-lg
- **Placeholder**: "Select your skills", "Filter by Platform"
- **Icon**: Chevron-down right-aligned

### Keyword Selection
See mockup: `.claude/docs/design/mockups/04-keywords-filled.png`

- **Progress Stepper**: "Step 3/3" with full-width progress bar (bg-blue-600)
- **Section Title**: font-bold text-xl centered
- **Description**: text-gray-500 centered
- **Add Input**: Input + "Add" button (bg-blue-600 rounded-lg)
- **Dropdown Selectors**: Full width, bg-blue-600 text-white, rounded-lg, py-3
- **Selected Keywords Section**: 
  - Section label: "Selected Skills (2)" - font-semibold
  - Container: bg-gray-50, rounded-lg, p-4, left-border accent (blue)
  - Pills: bg-gray-200 text-gray-700, rounded-full, with X icon to remove

### Keyword Pills (in leads)
- **Size**: px-3 py-1
- **Radius**: rounded-full
- **Colors**: bg-gray-100 text-gray-700
- **Font**: text-sm

### Platform Connection Cards
See mockup: `.claude/docs/design/mockups/03b-desktop-connect-platforms.png`

- **Layout**: Stacked list
- **Padding**: 16px
- **Border**: 1px solid border-gray-200
- **Content**: Platform icon + name + status text
- **Button**: "Connect to Slack" - bg-blue-600 text-white rounded-lg px-4 py-2
- **Status Text**: "Connected" in green when connected

### Status Badges
- **New**: bg-blue-100 text-blue-700
- **Connected**: text-green-600
- **Disconnected**: bg-red-100 text-red-800
- **Degraded**: bg-yellow-100 text-yellow-800

### Buttons

**Primary (CTA)**:
- Background: `#2563EB`
- Text: white
- Radius: rounded-full (login) or rounded-lg (actions)
- Padding: px-6 py-3

**Secondary**:
- Background: `#1E3A8A` (dark blue)
- Text: white
- Radius: rounded-full

**Tertiary/Outline**:
- Background: transparent
- Border: 1px solid gray-300
- Text: gray-700
- Radius: rounded-full

**Google OAuth**:
- Background: `#F3F4F6`
- Text: gray-700
- Icon: Google colored logo
- Radius: rounded-full

## Spacing Scale
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px

## Animation
- **Duration**: 150ms (default)
- **Easing**: ease-in-out
- **Button Hover**: Slight darkening of background
- **Card Hover**: Subtle shadow elevation

## Responsive Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## Design Reference Images

All mockups are in `.claude/docs/design/mockups/`. Reference these when implementing:

| Mockup | Description |
|--------|-------------|
| `01-login.png` | Login Page (Web App) - centered form with email/password |
| `01-login-alt.png` | Alternative Login Page design |
| `02-desktop-download-instructions.png` | Download Desktop App - text instructions |
| `02-desktop-download-support.png` | Download Desktop App - support information |
| `02-desktop-download-video.png` | Download Desktop App - video tutorial |
| `02-platform-connect.png` | Platform Connections view from Web App |
| `03a-desktop-app-login.png` | Desktop App - Login screen |
| `03b-desktop-connect-platforms.png` | Desktop App - Connect Slack/LinkedIn |
| `04-keywords-empty.png` | Keyword Selection - empty state |
| `04-keywords-filled.png` | Keyword Selection - with selected keywords |
| `05-lead-feed.png` | Lead Feed - main dashboard with lead cards |

**Critical**: Always check the mockups before implementing a new screen or component.