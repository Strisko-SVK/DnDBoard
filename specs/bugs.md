This file documents known bugs and issues in the application.

# Known Bugs and Issues

- **Issue 1**
  - **Description**: When creating a Quest on the board, the User was not able to add body text to the Quest.
  - **Status**: Resolved
  - **Resolution Notes**: Added `bodyMarkdown` textarea field to quest creation form (`frontend/app/boards/[id]/page.tsx`) and ensured backend endpoints already accept `bodyMarkdown`. New quests now persist full body content.

- **Issue 2**
  - **Description**: There is no obvious Inventory access, so Users could not see the quests they had accepted.
  - **Status**: Resolved
  - **Resolution Notes**: Inventory page already existed (`/inventory`). Added an "Inventory" button to the board toolbar for discoverability. Inventory lists accepted assignments with Complete / Abandon actions.

- **Issue 3**
  - **Description**: When a User declines a Quest, it did not disappear. Desired behavior: declined quests are removed from the list (no separate "show declined" toggle needed).
  - **Status**: Resolved
  - **Resolution Notes**: Removed the "Include Declined" checkbox. On decline, the client refetches quests; server already filters out declined quests unless explicitly asked. Declined quests now disappear immediately.

- **Issue 4**
  - **Description**: (Needs details – please add reproduction steps / observed vs expected behavior.)
  - **Status**: Open
  - **Next Action**: Provide description so it can be triaged.

## Verification Steps for Resolved Issues
1. Issue 1: Create a new quest, enter multi-line body text; reopen quest modal and confirm body renders.
2. Issue 2: Accept a quest; click Inventory button; confirm quest appears with status Accepted; Complete and Abandon actions work.
3. Issue 3: Decline a quest; confirm it disappears from board list without page reload; other quests remain.

## Pending / New Reports
Add new issues below using the same format:
```
- **Issue X**
  - **Description**: <problem>
  - **Status**: Open
  - **Notes**: <optional>
```
