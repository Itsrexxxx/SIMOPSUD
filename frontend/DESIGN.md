---
name: Aviation Light Blue
colors:
  surface: '#f4faff'
  surface-dim: '#d2dbe1'
  surface-bright: '#f4faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ecf5fb'
  surface-container: '#e6eff5'
  surface-container-high: '#e0e9ef'
  surface-container-highest: '#dbe4ea'
  on-surface: '#141d21'
  on-surface-variant: '#444651'
  inverse-surface: '#293236'
  inverse-on-surface: '#e9f2f8'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#002e3e'
  on-tertiary: '#ffffff'
  tertiary-container: '#164558'
  on-tertiary-container: '#87b2c8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#bee9ff'
  tertiary-fixed-dim: '#a1cde3'
  on-tertiary-fixed: '#001f2a'
  on-tertiary-fixed-variant: '#1e4c5f'
  background: '#f4faff'
  on-background: '#141d21'
  surface-variant: '#dbe4ea'
  text-primary: '#0F172A'
  status-optimal: '#22C55E'
  status-warning: '#F97316'
  status-critical: '#EF4444'
  border-soft: '#BAE6FD'
  header-navy: '#1E3A8A'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-padding: 24px
  gutter: 16px
  sidebar-width: 280px
  margin-sm: 8px
  margin-md: 16px
  margin-lg: 32px
---

## Brand & Style
The design system is engineered for high-stakes predictive analytics within a military aviation context. It prioritizes clarity, rapid information processing, and a professional "command center" aesthetic. 

The style is **Modern Corporate**, utilizing a sophisticated palette of atmospheric blues to reduce cognitive load during long periods of data monitoring. The visual narrative draws inspiration from head-up displays (HUDs) and modern avionics—replacing dark-mode tropes with a "high-visibility day-flight" interface that is bright, clean, and authoritative.

## Colors
The palette is structured to mirror the sky at different altitudes. The background utilizes a very soft light blue to provide a cohesive environment for white data containers. 

- **Primary & Secondary**: Navy and Royal blues are reserved for structural elements (headers, primary actions) and active state indicators.
- **Surface Strategy**: Pure white containers sit on the light blue background to create a crisp, "layered" look.
- **Functional Accents**: A strict tri-color status system (Green/Amber/Red) is used for predictive alerts, ensuring that critical data points are immediately distinguishable against the blue-toned interface.

## Typography
The system uses **Hanken Grotesk** for its high legibility and contemporary, technical feel. It provides a sharp, professional look suitable for military reporting. 

**JetBrains Mono** is introduced for labels, tactical badges, and data coordinates. This monospaced font reinforces the "predictive analytics" and "technical" nature of the system, ensuring that numerical data aligns perfectly in tables and dashboard widgets. Use uppercase for labels to enhance the "tactical" aesthetic.

## Layout & Spacing
The layout follows a **Fixed-Fluid hybrid grid**. 
- **Sidebar**: A fixed 280px sidebar on the left provides primary navigation. It uses a light blue background to distinguish it from the main content area without adding visual weight.
- **Main Content**: A fluid 12-column grid for the dashboard area with a 16px gutter.
- **Rhythm**: Use an 8px spacing scale. Elements should be grouped logically in containers with 24px internal padding to maintain a sense of openness and "air" within the interface.

## Elevation & Depth
In this design system, depth is communicated through **Tonal Layering** and **Low-Contrast Outlines** rather than heavy shadows.

- **Level 0**: Base background (#F0F9FF).
- **Level 1**: Primary containers/cards (#FFFFFF) with a 1px border in soft blue (#BAE6FD). No shadow is used here to maintain a clean, "blueprint" feel.
- **Level 2**: Hover states and active modals. Use a very subtle, highly diffused blue-tinted shadow (e.g., `0 4px 20px rgba(30, 58, 138, 0.08)`) to suggest a slight lift.
- **Overlays**: Use a light backdrop blur on top navigation bars or floating panels to maintain the "aviation glass" theme.

## Shapes
The shape language is **Soft** (0.25rem / 4px). This subtle rounding offers a more modern and accessible feel than sharp military corners, while remaining rigid enough to look "precision-engineered." 

- **Tactical Badges**: Should use the "Pill" shape (full rounding) to differentiate them from interactive buttons or data containers.
- **Graphs/Charts**: Data points and line terminals should remain sharp or minimally rounded to ensure mathematical precision is visually represented.

## Components
- **Primary Buttons**: Solid Navy Blue (#1E3A8A) with white text. Use Hanken Grotesk Bold.
- **Secondary Buttons**: White background with a 1px Navy Blue border.
- **Sidebar Navigation**: Light blue background. Active items use a Royal Blue (#0284C7) left-accent bar and Navy text. Icons should be stroke-based and consistent in weight.
- **Metrics Cards**: Pure white background, soft blue border. The "Value" should be large Navy Blue text, with a JetBrains Mono label at the top. 
- **Data Tables**: Headers use a soft blue background (#E0F2FE) with Dark Navy text. Rows use a 1px bottom border in #BAE6FD.
- **Tactical Badges**: Small, pill-shaped indicators for status (Optimal/Warning/Critical). These should use the status colors with high-contrast text.
- **TNI AU Crest**: Position the high-fidelity crest in the top-left of the sidebar or the "About" section as a mark of authority.