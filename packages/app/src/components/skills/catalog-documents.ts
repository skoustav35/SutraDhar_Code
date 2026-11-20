import { skillInstructions, type SkillCatalogItem } from "./catalog-types"

export const SKILLS_DOCUMENTS: SkillCatalogItem[] = [
  {
    id: "anthropic-pdf",
    name: "pdf",
    slash: "pdf",
    tagline: "Read, create, merge and fill PDFs",
    description:
      "Extract text and tables, fill forms, merge or split files, and generate new PDFs that keep their layout.",
    category: "documents",
    source: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/blob/main/skills/pdf/SKILL.md",
    license: "Source-available",
    triggers: ["reading a PDF", "extracting tables or forms", "building or combining PDFs"],
    boosts: ["Layout-aware extraction", "Form filling", "Merge and split"],
    preinstalled: true,
    instructions: skillInstructions(
      "pdf",
      "Read, create and edit PDF documents",
      `
## Workflow

1. Inspect the document first: page count, text layer, form fields, and whether pages are scanned images.
2. For text PDFs, extract with positional awareness and keep table rows aligned. Never flatten tables into prose.
3. For scanned pages, run OCR and mark low-confidence output for review instead of guessing.
4. For forms, read field names before writing values and preserve every untouched field.
5. When creating a PDF, start from a clear structure (title, sections, page breaks) and verify fonts embed correctly.
6. When merging or splitting, preserve bookmarks, page sizes, and rotation; validate the output page count.

## Quality checks

- Re-open the produced file and confirm it is not corrupted.
- Check that text is selectable and that tables round-trip.
- Report page numbers for every extracted fact so claims are verifiable.
`,
    ),
  },
  {
    id: "anthropic-docx",
    name: "docx",
    slash: "docx",
    tagline: "Draft and restyle Word documents",
    description:
      "Create .docx files with real heading styles, tables, and comments while keeping existing formatting intact.",
    category: "documents",
    source: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/blob/main/skills/docx/SKILL.md",
    license: "Source-available",
    triggers: ["writing a Word document", "editing an existing .docx", "adding tracked changes"],
    boosts: ["Style-safe edits", "Tables and lists", "Review comments"],
    preinstalled: true,
    instructions: skillInstructions(
      "docx",
      "Create and edit Word documents with styles",
      `
## Workflow

1. Read the document structure before editing: styles, numbering, sections, headers, and comments.
2. Use built-in heading styles for structure. Never fake headings with bold text.
3. Edit the smallest possible range and preserve run-level formatting around changes.
4. Add comments for review notes instead of leaving inline TODO text.
5. When creating a document, define styles once and apply them consistently.

## Quality checks

- Heading levels form a valid outline (no skipped levels).
- Lists use Word numbering, not typed bullets.
- Tables have header rows and repeat them across pages.
- The file opens without repair prompts.
`,
    ),
  },
  {
    id: "anthropic-xlsx",
    name: "xlsx",
    slash: "xlsx",
    tagline: "Build and audit spreadsheets",
    description: "Create workbooks with typed columns, auditable formulas, validation, and charts.",
    category: "documents",
    source: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/blob/main/skills/xlsx/SKILL.md",
    license: "Source-available",
    triggers: ["building a spreadsheet", "writing formulas", "auditing a workbook"],
    boosts: ["Formula audit", "Data validation", "Charts"],
    preinstalled: true,
    instructions: skillInstructions(
      "xlsx",
      "Create and analyse spreadsheets",
      `
## Workflow

1. Profile the data first: column types, missing values, duplicates, and date formats.
2. Keep one fact per cell and one table per sheet. Raw data stays on its own sheet, away from summaries.
3. Prefer readable formulas with named ranges over long nested expressions.
4. Use absolute references where a formula is copied across rows or columns.
5. Add validation and conditional formatting instead of hardcoded colour hacks.

## Quality checks

- Recalculate and confirm no #REF!, #VALUE!, or circular reference errors remain.
- Spot-check totals against an independent calculation.
- Verify charts point at the intended ranges after rows are inserted.
- Document assumptions in a notes column or sheet.
`,
    ),
  },
  {
    id: "anthropic-pptx",
    name: "pptx",
    slash: "pptx",
    tagline: "Design presentation decks",
    description: "Build slide decks with a consistent grid, readable typography, and speaker notes.",
    category: "documents",
    source: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/blob/main/skills/pptx/SKILL.md",
    license: "Source-available",
    triggers: ["creating a slide deck", "restyling a presentation", "writing speaker notes"],
    boosts: ["Narrative structure", "Grid and typography", "Speaker notes"],
    instructions: skillInstructions(
      "pptx",
      "Create and edit PowerPoint decks",
      `
## Workflow

1. Write the narrative first: one message per slide, in a deliberate order.
2. Use a single grid and a small type scale. Titles should be conclusions, not labels.
3. Prefer one strong visual per slide over dense bullet lists.
4. Put detail into speaker notes rather than shrinking the body text.
5. Preserve any existing template's master slides and theme colours.

## Quality checks

- Every slide has one clear takeaway.
- No text overflows its placeholder.
- Charts are legible when projected.
- The deck reads correctly in presentation mode.
`,
    ),
  },
  {
    id: "anthropic-canvas-design",
    name: "canvas-design",
    slash: "canvas",
    tagline: "Posters and graphics with print-quality layout",
    description: "Compose static visuals with a deliberate grid, palette, and typographic hierarchy.",
    category: "design",
    source: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/blob/main/skills/canvas-design/SKILL.md",
    license: "Source-available",
    triggers: ["designing a poster or social graphic", "laying out a one-pager", "choosing a palette"],
    boosts: ["Visual hierarchy", "Grid systems", "Colour pairing"],
    instructions: skillInstructions(
      "canvas-design",
      "Create polished static graphics",
      `
## Workflow

1. Decide the single focal message and the viewing distance before choosing any style.
2. Build a grid, then place elements on it. Keep margins generous and consistent.
3. Limit the palette to one dominant colour, one accent, and neutrals.
4. Use a maximum of two typefaces with a clear size jump between levels.
5. Check contrast for accessibility (4.5:1 for body text).

## Quality checks

- Squint test: the focal point still reads.
- No element touches the bleed edge unintentionally.
- Text is legible at the final export size.
- Export at the resolution the destination requires.
`,
    ),
  },
  {
    id: "anthropic-algorithmic-art",
    name: "algorithmic-art",
    slash: "art",
    tagline: "Generative art with p5.js",
    description: "Create seeded, reproducible generative art with clear parameter controls.",
    category: "design",
    source: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/blob/main/skills/algorithmic-art/SKILL.md",
    license: "Source-available",
    triggers: ["generative art", "creative coding", "p5.js sketches"],
    boosts: ["Seeded randomness", "Parameter design", "Motion studies"],
    instructions: skillInstructions(
      "algorithmic-art",
      "Create generative art sketches",
      `
## Workflow

1. Seed all randomness so every run is reproducible.
2. Expose the interesting parameters (density, scale, palette) instead of hardcoding magic numbers.
3. Start with a simple rule that produces surprising variety, then layer one effect at a time.
4. Keep the palette restrained; let form carry the composition.
5. Provide a static export path alongside the animated sketch.

## Quality checks

- The same seed produces the same output.
- The sketch runs at a usable frame rate.
- Interaction, if any, is discoverable without instructions.
`,
    ),
  },
  {
    id: "anthropic-brand-guidelines",
    name: "brand-guidelines",
    slash: "brand",
    tagline: "Apply brand voice and visuals consistently",
    description: "Turn brand assets into reusable rules for colour, type, tone, and layout.",
    category: "design",
    source: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/blob/main/skills/brand-guidelines/SKILL.md",
    license: "Source-available",
    triggers: ["applying brand guidelines", "auditing brand consistency", "writing on-brand copy"],
    boosts: ["Token extraction", "Voice and tone", "Consistency audit"],
    instructions: skillInstructions(
      "brand-guidelines",
      "Apply brand guidelines to new work",
      `
## Workflow

1. Extract the brand into tokens: colours, type scale, spacing, radii, and imagery rules.
2. Capture voice as concrete do/don't pairs with example sentences.
3. Apply tokens through variables rather than repeating raw values.
4. Audit an existing artifact against the rules and list violations by severity.

## Quality checks

- Every colour and font traces back to a token.
- Copy follows the voice examples, not just the adjectives.
- The result still works in dark mode and at small sizes.
`,
    ),
  },
  {
    id: "anthropic-internal-comms",
    name: "internal-comms",
    slash: "comms",
    tagline: "Status updates, FAQs and announcements",
    description: "Write clear internal communication with the right structure for the audience.",
    category: "productivity",
    source: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/blob/main/skills/internal-comms/SKILL.md",
    license: "Source-available",
    triggers: ["writing a status update", "drafting an announcement", "building an FAQ"],
    boosts: ["Audience framing", "Scannable structure", "Decision requests"],
    instructions: skillInstructions(
      "internal-comms",
      "Write internal communications",
      `
## Workflow

1. Identify the audience and the one action you want from them.
2. Lead with the decision or headline; keep the background below it.
3. Use short sections, active voice, and concrete dates.
4. For FAQs, answer the question in the first sentence and add detail after.
5. State owners and next steps explicitly.

## Quality checks

- The ask is visible in the first three lines.
- No unexplained acronyms.
- Dates are absolute, not "next week".
- The message can be skimmed in under a minute.
`,
    ),
  },
  {
    id: "anthropic-slack-gif-creator",
    name: "slack-gif-creator",
    slash: "gif",
    tagline: "Small, expressive GIFs for chat",
    description: "Create lightweight animated GIFs sized and paced for Slack reactions and announcements.",
    category: "design",
    source: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/blob/main/skills/slack-gif-creator/SKILL.md",
    license: "Source-available",
    triggers: ["making a GIF for chat", "animating a reaction", "creating a loop"],
    boosts: ["Loop design", "File-size control", "Chat-native sizing"],
    instructions: skillInstructions(
      "slack-gif-creator",
      "Create chat-ready animated GIFs",
      `
## Workflow

1. Design for a small canvas (128-480 px) and a short loop (1-3 seconds).
2. Make the first and last frame match so the loop is seamless.
3. Limit colours and frame count to keep the file small.
4. Convey one idea per GIF; motion should emphasise it, not compete with it.

## Quality checks

- Loop has no visible jump.
- File size is reasonable for chat upload.
- The GIF reads at thumbnail size.
- No flashing that could affect photosensitive users.
`,
    ),
  },
  {
    id: "anthropic-artifacts-builder",
    name: "artifacts-builder",
    slash: "artifact",
    tagline: "Self-contained React artifacts",
    description: "Build standalone HTML/React artifacts that run without a build step and handle their own state.",
    category: "engineering",
    source: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/blob/main/skills/artifacts-builder/SKILL.md",
    license: "Source-available",
    triggers: ["building a standalone demo", "prototyping a React widget", "sharing an interactive artifact"],
    boosts: ["No-build bundling", "Stateful prototypes", "Copy-paste delivery"],
    instructions: skillInstructions(
      "artifacts-builder",
      "Build self-contained interactive artifacts",
      `
## Workflow

1. Confirm the runtime constraints: single file, no bundler, limited dependencies.
2. Keep state local and serializable; persist to localStorage only when it helps the demo.
3. Inline styles or a small CSS block; avoid pulling a full UI framework for one screen.
4. Include realistic sample data so the artifact is immediately understandable.

## Quality checks

- Opening the file directly works offline.
- No console errors on first render.
- Layout survives a narrow viewport.
- Interactive states are keyboard reachable.
`,
    ),
  },
]
