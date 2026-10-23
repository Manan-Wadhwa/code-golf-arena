---
name: frontend-design
description: Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults.
---

# Frontend Design (Claude Design System)

Approach this as the design lead at an award-winning design studio known for giving every product a distinct visual identity that is never mistaken for anyone else's. Reject proposals that feel cliché, templated, or "AI-generated". Make deliberate, opinionated choices about palette, typography, and layout that are specific to this brief, and take aesthetic risks where justified.

## 1. Avoid Common AI Clichés ("The AI Slop Tells")
For calibration, AI-generated design frequently clusters around predictable defaults:
- A warm cream background (near `#F4F1EA`) with a high-contrast serif display and a terracotta accent (`#D97757`).
- A near-black background with a single neon acid-green or generic purple/indigo gradient wash.
- The SaaS card kit: content chopped into identical rounded cards, uniform border-radius on everything regardless of hierarchy, soft grey shadows (`rgba(0,0,0,.1)`), and gradient borders.
- Template chrome that appears regardless of subject: tracked-out ALL-CAPS eyebrow labels above every heading, meta strings joined with middle dots, spaced em dashes (`—`), and a `→` appended to every button.
- Walls of redundant subheadings and conversational filler text that dilute clarity.

Where the brief pins down a visual direction, follow it exactly. Where it leaves an axis free, do NOT spend that freedom on these defaults.

## 2. Two-Pass Design Process
1. **Design Plan First**:
   - **Color**: Describe the core base palette as 4–6 named hex values with distinct functional roles.
   - **Type**: Choose distinct typefaces with clear roles (e.g., high-contrast geometric display, crisp mono technicals, legible body).
   - **Layout**: Draft an intentional layout concept (asymmetric balance, editorial negative space, visual focal points).
2. **Ground in Subject Matter**:
   - Ground every visual element in the product's actual purpose (e.g., for Code Golf: byte counts, kinetic geometry, mechanical precision, minimal characters).
   - Let ONE element be the memorable showstopper (e.g., an interactive Three.js 3D kinetic gold sculpture), keeping everything around it disciplined, quiet, and sharp.

## 3. High Craft & Polish
- Build to a quality floor: responsive down to mobile, visible keyboard focus, reduced motion respected, WCAG AA contrast.
- Micro-interactions: Physics-based, tactile easing, avoiding uniform `transition: all .5s ease`.
- Keep copy punchy, direct, and purposeful: plain verbs, sentence case, no puffery.
