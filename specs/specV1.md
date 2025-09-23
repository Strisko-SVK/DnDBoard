# DnD Quest Board Web App — Product & Technical Specification (Spec‑Driven)

**Status:** Draft v1
**Owner:** DM/Stakeholder: Erik Strišovský
**Date:** 2025‑09‑23

---

## 1) Problem Statement

Dungeon Masters (DMs) need a simple, visual way to post quests/notes/flyers to multiple parties. Players need an interactive board to browse, preview, accept/decline quests, and keep accepted quests for later review ("inventory"). Multiple boards should be supported per DM.

---

## 2) Goals & Non‑Goals

### 2.1 Goals

* Provide an **interactive quest board** with draggable/arranged quest cards (flyers/notes) containing text and images.
* Allow **rich preview** of any quest from the board (full flyer/notes/images/attachments).
* Enable **players to accept/decline** a quest. Accepted quests move to the player’s (or party’s) **Quest Inventory**; declined quests remain or return to the board.
* Support **multiple boards** per DM (e.g., one board per party/campaign).
* DM can **create, edit, archive** quests; control visibility (public to party, hidden, draft, scheduled).
* Provide **basic permissions/roles** (DM, Player, Spectator/Viewer).
* Real‑time updates so all connected users see board and quest changes live.
* Mobile‑friendly UI.

### 2.2 Non‑Goals (v1)

* No character sheets, combat tracking, or VTT (virtual tabletop) features.
* No payment/subscription logic.
* No marketplace of public quests across different DMs.

---

## 3) Personas & Roles

* **DM (Dungeon Master):** Owns one or more Boards; creates/curates quests; assigns visibility; moderates player access per board.
* **Player:** Views boards they’re invited to; can browse/preview quests; accept/decline; maintain Inventory; optionally discuss via comments.
* **Spectator (optional):** Read‑only viewer if DM shares a public link (no accept/decline).
* **Admin (internal):** System operations, moderation (out of scope for player/DM flows but required for ops).

**Permissions Summary**

* DM: CRUD boards/quests, set visibility, reorder board, archive/restore quests, manage party membership, lock board.
* Player: View assigned boards, preview quests, accept/decline, comment, search/filter.
* Spectator: View read‑only if link enabled; no interactions.

---

## 4) Core Concepts & Definitions

* **Board:** A canvas/grid holding **Quest Cards** for one party/campaign. Has title, theme, background.
* **Quest:** A content item (flyer/note) with title, summary, rich body (Markdown), images, tags, difficulty, rewards, status (Draft, Posted, Accepted, Completed, Archived), visibility scope.
* **Inventory:** Player (or party) scoped list of **Accepted Quests** (and their states/history).
* **Party:** A named group of players bound to a Board.

---

## 5) User Stories & Acceptance Criteria

### 5.1 DM — Board Management

1. **Create Board**
   *As a DM, I can create a board with a title, description, background (color or image), and visibility (invite‑only / link view).*
   **AC:** Board appears in DM dashboard; DM can invite players via email or share link; default status: Active.

2. **Invite/Manage Players**
   *As a DM, I can invite/remove players to/from a board.*
   **AC:** Invited player receives access; removal revokes access immediately.

3. **Multiple Boards**
   *As a DM, I can manage multiple boards (one per party/campaign).*
   **AC:** Dashboard lists boards with counts of active/archived quests; quick switch between boards.

### 5.2 DM — Quest Lifecycle

4. **Create Quest**
   *As a DM, I can create a quest with title, summary, body (Markdown), images, tags, difficulty, rewards, and visibility/schedule.*
   **AC:** Quest can be saved as Draft or Posted; appears as a card on the board when Posted.

5. **Edit/Reorder/Archive**
   *As a DM, I can edit quests, drag to reorder, or archive them.*
   **AC:** Edits propagate in real‑time; archived quests disappear from board but remain retrievable in archive view.

6. **Lock/Unlock Board**
   *As a DM, I can temporarily lock a board (no accepts/declines) during a session.*
   **AC:** Players see a lock banner; accept/decline buttons disabled.

### 5.3 Player — Board & Inventory

7. **Browse Board**
   *As a Player, I can view a board of quest cards and hover/click for a quick preview.*
   **AC:** Board loads within 2s on broadband; infinite scroll/pagination supported; real‑time updates visible.

8. **Quest Preview**
   *As a Player, I can open a full quest preview modal/page with all text, images, and attachments.*
   **AC:** Modal shows title, tags, difficulty, rewards, last updated, author; images zoomable.

9. **Accept/Decline Quest**
   *As a Player, I can accept or decline a quest.*
   **AC:** On Accept, quest is added to Player (or Party) Inventory and marked `Accepted` (optionally lock to single party if DM configured). On Decline, quest remains on board; local preview closes.

10. **Inventory Management**
    *As a Player, I can view my Inventory of accepted quests and their statuses.*
    **AC:** Inventory sortable/filterable by status/tags/date; quest detail retains history (accepted at, updated at, completed at).

11. **Completion** (optional v1.1)
    *As a Player/DM, we can mark an accepted quest as Completed with notes/rewards claimed.*
    **AC:** Moves quest to Completed section; board state updates if configured to auto‑remove on completion.

### 5.4 Cross‑Cutting

12. **Search & Filter**
    *As any user with access, I can search by title/tags and filter by status, difficulty, rewards, and author.*
    **AC:** Debounced search; <300ms query time on 10k quests index.

13. **Comments/Discussion** (optional v1)
    *As a Player/DM, I can leave comments on a quest.*
    **AC:** Threaded comments with markdown; @mentions within a board.

14. **Real‑Time Presence**
    *As a user, I can see who else is currently viewing the board.*
    **AC:** Avatars/presence bubbles shown; typing indicators in comments.

---

## 6) Information Architecture & Data Model (MVP)

### 6.1 Entities

* **User** { id, email, displayName, avatarUrl, roles\[DM|Player|Admin], createdAt }
* **Board** { id, dmId (owner), title, description, background, theme, visibility \[invite|link], isLocked, createdAt, updatedAt }
* **Party** { id, boardId, name, memberIds\[], createdAt }
* **Quest** { id, boardId, title, summary, bodyMarkdown, images\[], tags\[], difficulty \[Trivial|Easy|Medium|Hard|Deadly], rewards { gp\:int?, items\[], xp?\:int }, status \[Draft|Posted|Accepted|Completed|Archived], visibility \[party|publicOnBoard], allowMultipleAccepts\:boolean, createdBy, createdAt, updatedAt }
* **QuestAssignment** (Inventory) { id, questId, boardId, assignedToType \[Player|Party], assignedToId, status \[Accepted|Completed|Abandoned], acceptedAt, completedAt, notes }
* **Membership** { id, boardId, userId, role \[DM|Player], invitedAt, joinedAt }
* **Comment** (optional) { id, questId, authorId, bodyMarkdown, createdAt, parentId? }
* **AuditLog** { id, actorId, action, entityType, entityId, at }

### 6.2 Indexes

* Quest(boardId, status, tags, updatedAt)
* QuestAssignment(assignedToId, status)
* Membership(boardId, userId)

---

## 7) System Architecture (MVP)

* **Frontend:** React (Next.js 14+), TypeScript, TailwindCSS. State via React Query + Zustand. Rich text via Markdown editor (e.g., TipTap/MDX). Image crop/resize client‑side.
* **Backend:** Node.js (NestJS or Express). REST + WebSocket (or GraphQL + Subscriptions). Real‑time via Socket.IO or WebSockets.
* **Database:** PostgreSQL (primary). Redis for cache/presence/pubsub.
* **Storage:** S3‑compatible (images/attachments). CDN fronting for assets.
* **Auth:** Email/password + Magic link (JWT). Invite tokens per board. Optional OAuth (Google) later.
* **Search:** Postgres trigram/tsvector or lightweight Meilisearch for full‑text tags/title.
* **Infra:** Dockerized; deploy on Render/Fly.io/Vercel+Railway. CI/CD via GitHub Actions. Infrastructure as code (Terraform) optional later.

**Real‑Time Flow:**

* Client subscribes to `board:{id}` channel; receives quest/board updates, presence, comments.
* Server broadcasts on quest create/update/status change; presence pings via Redis pubsub.

---

## 8) API Design (REST, MVP)

### Auth

* `POST /auth/register` { email, password, displayName }
* `POST /auth/login` { email, password } -> { accessToken }

### Boards

* `GET /boards` -> boards where user is DM or member
* `POST /boards` -> create board (DM only)
* `GET /boards/:id` -> board detail, membership, counts
* `PATCH /boards/:id` -> update title/desc/background/lock
* `POST /boards/:id/invite` -> invite emails\[] (DM)
* `DELETE /boards/:id/members/:userId` -> remove member (DM)

### Quests

* `GET /boards/:boardId/quests?status=&tags=&q=` -> list
* `POST /boards/:boardId/quests` -> create quest (DM)
* `GET /quests/:id` -> quest detail
* `PATCH /quests/:id` -> edit quest
* `POST /quests/:id/archive` -> archive (DM)

### Inventory (Assignments)

* `POST /quests/:id/accept` { assignedToType, assignedToId } -> creates QuestAssignment, sets quest status=Accepted if single‑party; respects allowMultipleAccepts flag
* `POST /assignments/:id/complete` -> mark completed
* `GET /inventory?boardId=&assignedToId=` -> list of accepted quests

### Comments (optional v1)

* `GET /quests/:id/comments`
* `POST /quests/:id/comments` { bodyMarkdown, parentId? }

### Real‑Time (WebSockets)

* `board:update` (board locked/unlocked, member join/leave)
* `quest:update` (create/edit/status)
* `comment:new`
* `presence:update`

**Security:** All endpoints scoped by JWT; RBAC middleware checks membership & role. Rate limiting on public endpoints (Cloudflare/NGINX).

---

## 9) UX & UI Requirements

### 9.1 Board

* Masonry/grid layout of **Quest Cards** with cover image or styled text flyer.
* Card shows: title, tags, difficulty, short summary, mini‑badges (images attached, rewards icon), hover to quick‑preview.
* **Drag‑to‑reorder** (DM only). Keyboard navigation for accessibility.
* Toolbar: search, filters (status/tags/difficulty), sort (updated, difficulty), board lock toggle (DM).

### 9.2 Quest Preview

* Modal or dedicated page with: title, author, updated at, tags, difficulty, rewards, gallery (lightbox), body markdown.
* Primary actions: Accept, Decline (disabled if board locked or user lacks permission).
* Secondary: Comment tab (if enabled), share internal link, copy quest ID.

### 9.3 Inventory

* List/cards with status pills (Accepted/Completed). Filters by board, tag, updated date. Quick actions: open quest, mark completed (v1.1).

### 9.4 Responsive

* Mobile: single‑column list; sticky Accept button in preview.
* Desktop: 3–5 column grid; modal preview.

### 9.5 Accessibility

* WCAG AA; proper aria labels; keyboard‑first flows; alt text for images.

---

## 10) State Machine (Quest)

```
Draft -> Posted -> Accepted -> Completed -> Archived
                 └──────────-> Archived
Accepted -> Abandoned (optional) -> Posted (if allowed)
```

**Rules:**

* DM can move from Draft to Posted to Archived at any time.
* Accept may lock quest to the accepting party if `allowMultipleAccepts=false`.
* Completing auto‑moves to Completed; optional auto‑remove from board.

---

## 11) Validation & Edge Cases

* Accepting a quest already accepted by another party when `allowMultipleAccepts=false` returns 409 Conflict.
* Player without membership attempts to view board returns 403.
* Deleted image references gracefully handled (placeholder shown).
* Large images auto‑compressed on upload; max 10MB each; up to 20 per quest.

---

## 12) Performance & NFRs

* P95 interactive board load < 2s (cached) / < 3.5s cold.
* Real‑time fan‑out latency < 500ms.
* Uptime target 99.5% (MVP).
* Backups: daily DB snapshot; object storage versioning enabled.
* GDPR basics: deletion on request; export user data (JSON).

---

## 13) Analytics & Telemetry

* Events: quest\_created, quest\_posted, quest\_accepted, quest\_declined, quest\_completed, board\_locked, board\_unlocked, search\_used, filter\_applied.
* Error tracking via Sentry; perf via Web Vitals.

---

## 14) Content & Theming

* Board themes (paper, parchment, stone, wood).
* Custom background image per board.
* Quest card frames with fantasy vibes; toggleable minimal theme.

---

## 15) Security & Privacy

* JWT with refresh tokens; HttpOnly cookies.
* RBAC per board; invite tokens single‑use expiring in 7 days.
* All uploads virus‑scanned (clamav container) before persist.
* CSP and signed asset URLs.

---

## 16) Testing Strategy

* Unit tests for services (quest lifecycle, permissions).
* Integration tests for REST endpoints (Supertest).
* E2E happy paths: DM creates board, posts quest; Player accepts; Inventory shows item.
* Load tests (k6) for 1k concurrent users across 50 boards.

---

## 17) Release Plan (MVP → v1.1)

**MVP (4–6 sprints)**

* Auth, Boards, Quests (Draft/Posted/Archive), Accept/Decline, Inventory, Real‑time, Basic search/filter, Responsive UI.

**v1.1**

* Complete/Abandon states, Comments, Presence, Scheduled posting, Public read‑only links, Theming polish.

---

## 18) Open Questions

* Inventory scope: per Player vs per Party (default: **per Party**, configurable per board)?
* Multiple accepts: default allow vs disallow? (default: **disallow**, single party claim.)
* Should DM be able to push a quest directly into a party’s inventory (assignment)? (Proposed: **yes**, as admin action.)

---

## 19) Definition of Done (DoD)

* All MVP stories pass AC; documented APIs; API reference generated (OpenAPI).
* QA sign‑off for core flows on desktop & mobile.
* Security checklist (authz tests, rate limits).
* Observability: SLO dashboards for latency and errors.

---

## 20) Appendix: Example JSON Payloads

### Quest (POST)

```json
{
  "title": "Bandits on the East Road",
  "summary": "Merchants report attacks near the Old Mill.",
  "bodyMarkdown": "## Details\n- Scout the area...",
  "images": ["s3://boards/quests/q1/cover.jpg"],
  "tags": ["bandits", "road", "investigation"],
  "difficulty": "Medium",
  "rewards": {"gp": 150, "items": ["Potion of Healing"]},
  "visibility": "publicOnBoard",
  "allowMultipleAccepts": false
}
```

### Accept Quest

```json
{
  "assignedToType": "Party",
  "assignedToId": "party_123"
}
```
