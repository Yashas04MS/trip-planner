---
name: Quiet-Luxury Travel Concierge
colors:
  surface: '#0e1607'
  surface-dim: '#0e1607'
  surface-bright: '#333c2a'
  surface-container-lowest: '#091004'
  surface-container-low: '#161e0e'
  surface-container: '#1a2212'
  surface-container-high: '#242d1c'
  surface-container-highest: '#2f3826'
  on-surface: '#dce6cd'
  on-surface-variant: '#c6c8ba'
  inverse-surface: '#dce6cd'
  inverse-on-surface: '#2a3322'
  outline: '#909285'
  outline-variant: '#45483e'
  surface-tint: '#bdcd99'
  primary: '#bdcd99'
  on-primary: '#29340f'
  primary-container: '#68764a'
  on-primary-container: '#edfdc6'
  inverse-primary: '#566339'
  secondary: '#becca0'
  on-secondary: '#293414'
  secondary-container: '#414d2b'
  on-secondary-container: '#b0be92'
  tertiary: '#e1c1a5'
  on-tertiary: '#402c19'
  tertiary-container: '#866c54'
  on-tertiary-container: '#fff4ee'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d9e9b4'
  primary-fixed-dim: '#bdcd99'
  on-primary-fixed: '#141f00'
  on-primary-fixed-variant: '#3f4b24'
  secondary-fixed: '#dae8ba'
  secondary-fixed-dim: '#becca0'
  on-secondary-fixed: '#151f03'
  on-secondary-fixed-variant: '#3f4b29'
  tertiary-fixed: '#ffdcbf'
  tertiary-fixed-dim: '#e1c1a5'
  on-tertiary-fixed: '#291806'
  on-tertiary-fixed-variant: '#59422d'
  background: '#0e1607'
  on-background: '#dce6cd'
  surface-variant: '#2f3826'
typography:
  headline-xl:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Sora
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Sora
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Sora
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Sora
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-code-strong:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

The design system establishes a quiet-luxury, human-in-the-loop travel concierge experience. Moving deliberately away from the cold glass and neon tropes of generic AI assistants, the interface evokes the reassuring tactile quality of bespoke executive travel services, fine-grain archival stationery, and aeronautical boarding passes. 

The aesthetic is characterized by:
- **Quiet-Luxury Warmth:** A sophisticated dark mode paper canvas grounded by deep olive typography, restrained sage structure, and micro-accents of warm leather brown.
- **Boarding-Pass Precision:** Clean hairline grids, tabular data clarity, route-line flourishes, and notched ticket cards.
- **Calm Operational Control:** The UI functions as a serene executive workbench where voice input, real-time tool logs, and critical approvals coexist without visual noise.

Interactions prioritize calm authority over excitement. The overall impression is effortless, curated, and impeccably organized.

## Colors

The color architecture is built specifically for a sophisticated dark mode presentation, preserving the physical tactility of archival paper and linen surfaces under low-light or executive night-flight conditions.

### Palette Roles & Application Rules
- **Canvas & Surfaces:** Deep neutral `#343D2B` serves as the canvas foundation. Component cards sit on complementary dark surfaces, with elevated panels stepping up for depth. Structural divisions use the soft muted sage for clarity.
- **Text & Contrast:** Primary text is set in high-contrast tones for authoritative readability against dark backgrounds. Secondary information uses softened sage-grey, while timestamps and metadata default to muted equivalents.
- **Primary Olive (`#68764A`):** The primary interactive driver. Used for active CTA buttons, active radio indicators, and focused strokes. For primary buttons and the VoiceOrb, it expands into a rich gradient paired with high-contrast text.
- **Restrained Earthy Brown (`#8B7058`):** Strictly budgeted to ≤5% of visual area. Reserved exclusively for micro-details: waypoint route dots, hairline itinerary links, departure-time emphasis chips, and small decorative dividers.
- **Semantic Feedback:** System states use muted, nature-derived tones optimized for dark mode legibility: Confirmed/Success, Approval Needed/Warning, Cancellation/Danger, and Informational badges.

## Typography

The typographic hierarchy combines geometric structure with utilitarian legibility:
- **Headings (Sora):** Selected for its crisp geometric posture and warm, rounded curves that reflect high-end travel branding. Used across all editorial landmarks, stage headings, and card titles.
- **Body & Controls (Inter):** Ensures legibility across multi-turn concierge transcripts, travel itineraries, and policy terms. Tabular figures (`font-variant-numeric: tabular-nums`) must be activated for all prices, flight codes, dates, and countdown clocks to ensure uniform vertical alignment.
- **System Logs & Tool Calls (JetBrains Mono):** Provides clear technical structure for real-time tool execution states, latency metrics, passenger reference locator (PNR) codes, and raw booking payloads.

## Layout & Spacing

The layout is structured around an executive split-pane architecture designed for fluid human-in-the-loop oversight.

### Layout Mechanics
- **Desktop (≥ 1024px):** A fixed 72px left navigation rail paired with a dual-pane workspace:
  - **Voice Stage (60% width):** Houses the centered VoiceOrb, dynamic wave visualizers, real-time live captions, and high-level flight route overview.
  - **Agent Workbench (40% width):** Displays structured itinerary cards, interactive tool logs, flight selection rows, and payment authorization summaries.
- **Tablet (768px – 1023px):** Collapses into a responsive single-column feed where the workbench stacks below a condensed voice stage bar.
- **Mobile (< 768px):** A dynamic canvas with a sticky bottom action bar (featuring an elevated 56px voice trigger). The Agent Workbench transforms into an interactive bottom sheet with a 160px peek height that snaps upward to 90% viewport height when critical actions or booking approvals arrive.

### Grid & Spacing Rhythm
Spatial rhythm follows a strict 4px/8px incremental grid. Elements within cards maintain `space-sm` (8px) to `space-md` (16px) gaps. Sections use `space-xl` (32px) to `space-2xl` (48px) margins to preserve the calm, unhurried quiet-luxury atmosphere.

## Elevation & Depth

Visual hierarchy is communicated through structural borders, dark paper planes, and subtle luminance differences rather than heavy shadows.

- **Flat Tonal Layering:** The primary depth mechanic uses crisp 1px borders in subtle tones over the dark canvas surfaces.
- **Card Shadows:** Standard cards have zero drop shadow. On hover, interactive cards lift using very soft, diffused dark-mode glow effects.
- **The VoiceOrb:** Features a centered multi-stop radial gradient with a soft ambient aura that breathes dynamically with input volume.
- **Approval & Takeover Elevation:** When an action requires passenger confirmation, the card receives a focused 1px border and a soft ambient glow.

## Shapes

The interface balances soft architectural curves with precision travel silhouettes.
- **Cards & Outer Panels:** Uniform `16px` (`rounded-lg`) corner radii create contained, welcoming surfaces.
- **Buttons & Form Fields:** Structured with `12px` corner radii, maintaining harmony with outer containers while signaling interactive capability.
- **Badges, Tags, & Pills:** Fully rounded (`9999px`) to distinguish metadata chips, class badges, and live status indicators from structured layout blocks.
- **Ticket-Stub Cutout Motif:** Booking confirmation and boarding pass cards incorporate semi-circular inward notches midway down their left and right borders, flanked by a subtle dotted divider to evoke tactile travel tickets.

## Components

### Buttons
- **Primary CTA:** Styled with gradient primary fills, pure white text, `12px` border radius, and `14px` vertical padding. Hover states deepen the gradient brightness slightly.
- **Secondary Action:** Transparent background with a `1px` border, featuring high-contrast text. On hover, the background transitions smoothly.
- **Destructive / Disconnect:** Ghost or outline button with danger text and matching border; used strictly for ending calls or rejecting proposals.

### Interactive VoiceOrb
- **Structure:** Perfectly circular element (`220px` desktop, `160px` mobile) filled with gradient orb styles.
- **States:**
  - *Idle:* Subtle breathing scale oscillation.
  - *Listening:* Dynamic expanding ripples rendered at low opacities.
  - *Thinking:* A slow-spinning segmented ring.
  - *Speaking:* Smooth sinusoidal waveforms reactive to output speech amplitude.

### Ticket-Stub Booking Card
- Primary container with card surface styling, `16px` outer radius, and a 1px structural border.
- Features symmetrical circular cut-outs at the middle horizontal split, bridged by an earthy brown dotted hairline rule.
- Flight and seat details are set with Sora headings and tabular numerals in Inter.

### Route-Line Waypoint Indicators
- Waypoint paths use a dashed stroke. Terminal points and layover stations are rendered as small solid dots in accent brown, flanked by departure codes in `JetBrains Mono`.

### Chips & Metadata Badges
- **Status Pills:** Background tints with high-contrast text, `9999px` radius, padding `4px 10px`.
- **Warm Micro-Chips:** Tiny tags use specialized contrasting backgrounds and text colors.

### Input Fields & Controls
- **Form Inputs:** Surface background, 1px solid border, corner radius `12px`. On focus, border transitions to the primary accent with zero harsh box-shadow.
- **Checkboxes & Radios:** Styled with primary accent active fills and rounded corners (`4px` for checkboxes, `50%` for radios).