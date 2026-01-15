# Novee Design System

## Overview
Novee uses a clean, professional SaaS aesthetic focused on clarity and efficiency. The design prioritizes information density without feeling cluttered.

## Color Palette

### Light Theme
- **Primary**: `#3B82F6` (Blue) - CTAs, links, active states
- **Secondary**: `#10B981` (Green) - Success states, connected status
- **Accent**: `#F59E0B` (Amber) - Warnings, pending states
- **Background**: `#FFFFFF` - Page background
- **Surface**: `#F9FAFB` - Cards, elevated surfaces
- **Text Primary**: `#1F2937` - Headings, labels
- **Text Secondary**: `#6B7280` - Descriptions, metadata
- **Border**: `#E5E7EB` - Dividers, card borders

### Dark Theme
- **Primary**: `#60A5FA` (Lighter Blue)
- **Secondary**: `#34D399` (Lighter Green)
- **Background**: `#111827`
- **Surface**: `#1F2937`
- **Text Primary**: `#F9FAFB`
- **Border**: `#374151`

## Typography
- **Font**: Inter (primary), SF Pro (fallback)
- **Display (h1)**: 36px / font-bold / tracking-tight
- **Heading 1**: 30px / font-semibold
- **Heading 2**: 24px / font-semibold
- **Body**: 16px / font-normal / leading-normal
- **Caption**: 12px / font-normal / text-gray-600

## Components

### Lead Cards
See mockup: `.claude/docs/design/mockups/dashboard-desktop.png`

- **Layout**: Grid (1 col mobile, 2 cols tablet, 3 cols desktop)
- **Padding**: 24px (p-6)
- **Border**: 1px solid border-gray-200
- **Radius**: 12px (rounded-xl)
- **Shadow**: Subtle on hover (hover:shadow-md)

**Anatomy:**
- Header: Platform icon + Channel name (text-sm, text-gray-600)
- Body: Message snippet (text-base, line-clamp-3)
- Footer: Timestamp + Matched keywords (pills)
- Actions: 3 buttons (Interested, Not Interested, Open Source)

### Keyword Pills
- **Size**: px-2.5 py-0.5
- **Radius**: rounded-full
- **Colors**: bg-primary/10 text-primary
- **Hover**: bg-primary/20

### Status Badges
- **Connected**: bg-green-100 text-green-800
- **Disconnected**: bg-red-100 text-red-800
- **Degraded**: bg-yellow-100 text-yellow-800

## Spacing Scale
- **xs**: 8px
- **sm**: 12px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px

## Animation
- **Duration**: 200ms (default)
- **Easing**: ease-in-out
- **Hover Scale**: scale-[1.02]
- **Active Scale**: scale-[0.98]

## Responsive Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## Design Reference Images

All mockups are in `.claude/docs/design/mockups/`. Reference these when implementing:

1. **dashboard-desktop.png**: Main lead feed with filters
2. **dashboard-mobile.png**: Mobile-optimized layout
3. **onboarding-flow.png**: 3-step onboarding screens
4. **platform-connections.png**: Platform status cards
5. **keyword-selection.png**: Keyword selection interface

**Critical**: Always check the mockups before implementing a new screen or component.