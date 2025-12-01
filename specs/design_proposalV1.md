. Aesthetic Theme & Visual Language
Metaphor: A busy, well-worn wooden notice board in a bustling fantasy tavern.

Color Palette: Earth tones.

Backgrounds: Dark oak wood textures, aged leather.

Content Surfaces (Cards/Modals): Varied parchment hues (creams, aged yellows, textured paper).

Accents (Actions): Deep crimson (Decline/Important), Burnished Gold/Brass (Accept/Rewards), Forest Green (Completed).

Typography:

Headers & Titles: A thematic, slightly distressed fantasy serif font (e.g., similar to Uncial Antiqua or Cinzel Decorative), but legible.

Body Text: A clean, high-readability sans-serif designed for screens (e.g., Inter or Roboto).

Accessibility Contrast: While textured, text color will be a very dark brown (e.g., #3E2723) against light parchment to ensure WCAG AA compliance, avoiding harsh pure black.

2. The Layout Framework (Navigation)
   A persistent navigation structure ensures users always know where they are.

Desktop (Left Sidebar): A dark, leather-textured vertical panel.

Campaign Selector: A dropdown at the top to switch between different boards (if the user is in multiple campaigns).

Navigation Links: Large, brass-rimmed icons with labels:

[Icon: Wooden Sign] Quest Board (Home)

[Icon: Leather Satchel] My Inventory

DM Tools (Conditional): Only visible to DMs.

[Icon: Quill & Ink] Manage Quests

[Icon: Gear] Settings/Users

User Profile: At the bottom.

Mobile (Bottom Navigation Bar): A fixed wooden bar at the bottom of the screen with essential icons: [Board] | [Inventory] | [DM Tools] | [More Menu].

3. Key Views & Components
   3.1 The Board (The Tavern Wall)
   This is the main view. It uses a Masonry Grid layout (like Pinterest), meaning cards stack based on their height, creating an organic, cluttered look rather than a rigid grid.

The Toolbar (Top of view): A wooden plank bar housing controls.

Left: Search bar (magnifying glass icon) stylized as a carved slot.

Center: Filter Dropdowns stylized as wax seals (Status, Difficulty, Tags).

Right: Sort icon, and a prominent DM Lock Toggle (a brass padlock icon). When locked, a tooltip confirms: "DM is updating the board. Quests cannot be accepted."

The Quest Card Component: Designed to look like individual notes pinned to the board.

VISUAL DESCRIPTION: THE QUEST CARD A rectangular piece of textured parchment paper with slightly torn, curled edges.

Top Section (Optional): If a cover image exists, it's a faded, thematic image (e.g., a spooky ruin). If no image, a large, stylized text header.

Title: Bold, fantasy font title (e.g., "Wanted: The cellar rats").

Meta-Data Line: Directly below title. A small skull icon next to difficulty text, color-coded (Green "Easy" to Red "Deadly").

Summary Body: 3-4 lines of readable text giving the hook, ending with an ellipsis "...".

Footer:

Left: Small tag "chips" looking like scraps of paper (e.g., #Combat, #Mystery).

Right: Small metallic icons indicating extras: A paperclip (attachments) or a coin pouch (rewards).

Interaction: Hovering makes the card lift slightly with a shadow. For DMs, a textured "grip" area appears in the corner for dragging to reorder.

3.2 Quest Preview (The Scroll Modal)
Clicking a card opens a detailed modal overlay.

VISUAL DESCRIPTION: PREVIEW MODAL (DESKTOP) The background dims. A large, ornate scroll unfurls in the center of the screen.

Layout: A two-column split.

Left Column (The Narrative - 65%):

Huge title at the top. Author/Questgiver name below it.

Body Content: Rich Markdown text. Bold instructions, italicized flavor text, bulleted lists of objectives. It feels like reading a handout.

Right Column (The Logistics - 35%):

Reward Block: A prominent wooden plaque showing shiny icons: "500 XP", "250 Gold Pieces", "Ring of Protection".

Gallery: Thumbnails of maps or monster art. Clicking opens a full lightbox.

Primary Actions (Sticky at bottom of column): Two large, thematic buttons.

[ACCEPT QUEST] (Button looks like burnished gold/green wax seal).

[DECLINE] (Button looks like muted iron/red wax seal).

Note: If the board is locked or user is a spectator, these are greyed out and look inactive.

Secondary Actions: Small text links below buttons: "Share Link", "Copy ID".

3.3 Player Inventory (The Satchel)
A cleaner view for accepted quests.

Layout: A list of uniform, horizontal "List Cards" stacked vertically. Less chaotic than the main board.

Content per Item: Title | Campaign Name | Date Accepted | Status Pill.

Status Pill: A clear, colored lozenge on the right:

[ACCEPTED] (Yellow/Gold background)

[COMPLETED] (Green background, maybe with a checkmark)

4. Mobile Responsiveness (Key Requirements)
   The design adapts for smaller screens while maintaining functionality.

Mobile Board: The masonry grid collapses into a single vertical column of cards. The toolbar filters collapse into a single "Filter" button that opens a side drawer.

Mobile Preview (Crucial UX): Instead of a center modal, clicking a card opens a full-screen view or a tall "bottom sheet" that slides up.

VISUAL DESCRIPTION: MOBILE PREVIEW & STICKY FOOTER The quest details fill the mobile screen. The user scrolls down to read the long description and see images.

Sticky Footer: Regardless of scrolling, a fixed bar remains at the very bottom of the screen containing the primary actions. This ensures the player doesn't have to scroll back up or down to act.

[ DECLINE (Iron Button) ] [ ACCEPT QUEST (Gold Button) ]

5. Accessibility & Real-time Considerations
   Real-time: All actions (DM moving a card, player accepting a quest) happen instantly for all connected users without refreshing. Visual cues, like a card briefly glowing before disappearing when accepted by someone else, will be used.

Keyboard Navigation (WCAG AA): Users can Tab through the board. Focus states will be clearly visible (e.g., a glowing border around the currently selected card). Enter opens the preview modal. Esc closes the modal.

DM Reordering Alternative: Since drag-and-drop is hard for some users, the DM's card menu (three dots) must include an option like "Move to position X" via a dropdown menu.

Alt Text: The DM quest creation form must require alt text for any uploaded images.