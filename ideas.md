# Peter Pan Ballet Gala - Design Brainstorm

## Response 1: Theatrical Elegance (Selected)
**Probability: 0.08**

### Design Movement
**Art Deco meets Contemporary Luxury** - Inspired by 1920s theatrical design with modern minimalism. The aesthetic celebrates the ballet's theatrical heritage while maintaining contemporary sophistication.

### Core Principles
1. **Dramatic Contrast** - Bold gold accents against deep burgundy/dark backgrounds create visual hierarchy and luxury
2. **Geometric Precision** - Clean lines, symmetrical layouts, and structured grids reflect theatrical stage design
3. **Refined Restraint** - Minimal ornamentation; every element serves a purpose. Whitespace is generous and intentional
4. **Tactile Luxury** - Subtle textures, soft shadows, and refined typography evoke premium materials

### Color Philosophy
- **Primary Gold (#C9A84C)** - Represents theatrical spotlights, elegance, and prestige. Used for CTAs, highlights, and premium elements
- **Deep Burgundy (#1A0911)** - Evokes theater curtains and luxury. Creates dramatic backdrop for content
- **Teal (#14B8A6)** - Modern accent representing available seats and interactive states. Fresh counterpoint to warm golds
- **Off-white (#F5F0EB)** - Warm, sophisticated text color with excellent contrast against dark backgrounds
- **Supporting Grays** - #4B5563 for held seats, subtle shadows for depth

### Layout Paradigm
- **Vertical Theater Axis** - Hero section dominates with full-screen immersion, then content flows downward like a stage curtain rising
- **Asymmetric Seating Map** - Theater grid centered with row labels flanking left/right, creating a natural focal point
- **Floating Elements** - WhatsApp button floats independently; payment modal overlays with theatrical focus
- **Generous Margins** - Content doesn't stretch edge-to-edge; breathing room on sides maintains elegance

### Signature Elements
1. **Gold-Bordered Buttons** - Distinctive CTA style with teal fill, gold border, and subtle glow on hover
2. **Pulsing Seat Animations** - Selected seats pulse with teal glow; held seats show calm gray; creates visual feedback hierarchy
3. **Theatrical Dividers** - Subtle horizontal separators between sections, styled as stage lighting transitions

### Interaction Philosophy
- **Responsive Feedback** - Every interaction (seat click, button hover) produces immediate visual confirmation
- **Progressive Disclosure** - Form fields appear dynamically as seats are selected; payment details reveal in stages
- **Urgency Through Color** - Timer transitions from teal → amber → red as deadline approaches, creating natural urgency
- **Graceful Degradation** - Locked states and expired sessions show support options prominently, never leaving users stranded

### Animation
- **Entrance Animations** - Elements fade in and slide up on page load (200-300ms ease-out)
- **Seat Selection** - Gold fill animates in smoothly; pulsing border on held seats (1.5s cycle)
- **Timer Transitions** - Color shifts happen smoothly; text pulses intensify as time runs out
- **Button Interactions** - Subtle scale (0.97) on click; hover state lifts with soft shadow
- **Modal Appearance** - Payment modal slides up from bottom with overlay fade (250ms)
- **Respect Motion Preferences** - All animations respect `prefers-reduced-motion` media query

### Typography System
- **Headings: Cormorant Garamond** - Elegant serif with generous letter spacing. Sizes: 3xl-8xl for hero, 2xl for sections
- **Body: Lato** - Clean sans-serif, highly readable. Weights: 400 (regular), 700 (emphasis)
- **Hierarchy** - Hero title dominates at 6xl/7xl; section headers at 2xl; body text at base/lg
- **Letter Spacing** - Increased on headings (0.05em) for theatrical elegance; normal on body text

---

## Response 2: Minimalist Modern
**Probability: 0.07**

Clean, contemporary design with flat colors, sans-serif typography, and micro-interactions. Focus on clarity and speed of interaction over theatrical drama.

---

## Response 3: Playful Whimsy
**Probability: 0.06**

Illustrated, character-driven design with Peter Pan imagery, rounded corners, playful animations, and vibrant pastels. Targets younger audiences with joy and movement.

---

## Selected Design: Theatrical Elegance

I've selected **Theatrical Elegance** as the design philosophy. This approach honors the ballet's premium nature while creating a sophisticated, user-focused booking experience. The gold-and-burgundy palette evokes luxury theater environments, while the teal accents provide modern interactivity. Every animation and interaction will feel intentional and refined, not gratuitous.

**Key Design Decisions:**
- Deep burgundy background (#1A0911) creates dramatic contrast for gold elements
- Cormorant Garamond headings provide elegant, distinctive typography
- Generous whitespace prevents visual clutter and maintains premium feel
- Pulsing animations on timers create urgency without aggressive design
- Gold-bordered buttons become signature interactive elements
- Theater-inspired layout with centered seating map and floating support button
