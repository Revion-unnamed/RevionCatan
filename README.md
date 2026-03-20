# RevionCatan

A mobile-friendly HTML5 implementation of Catan (Settlers of Catan) board game with expansions and scenarios.

## Project Overview

**What We're Building:** A playable Catan game that runs in any browser, optimized for mobile devices. Players can enjoy classic Catan plus expansions like Explorers & Pirates, Fishermen of Catan, and more.

**Target Audience:** Mobile players coding on-the-go using a browser.

**Development Approach:**
- Mobile-first design (touch-friendly, responsive)
- Vanilla JavaScript (no frameworks, easier for beginners)
- Modular code organization (one file per major feature)
- Well-commented code for learning and maintenance
- Progressive feature additions (classic mode first, then expansions)

## Architecture

### Core Files

- **index.html** - Main page structure and layout
- **catan.js** - Core game logic (board, turns, resources, building, trading)
- **catan.css** - Styling and responsive design
- **debug.js** - Mobile debugging console (see errors and logs in-game)

### Expansion Files

- **explorers.js** - Explorers & Pirates expansion
- **fishermen.js** - Fishermen of Catan scenario

## How to Run

1. Clone this repository
2. Open `index.html` in any web browser
3. Start a game and play!

## Code Style Guidelines

### Comments
- Add explanatory comments for **why** not **what**
- Comment complex logic and game rules
- Keep comments clear and helpful for beginners
- Section headers use: `// ============ SECTION NAME ============`

### File Organization
- Each file has one main purpose
- Related functions grouped together
- Clear imports and dependencies at the top

### Game Loop
- Player selects actions (roll dice, build, trade)
- Game updates board and resources
- UI reflects current game state
- Turn passes to next player

## Current Features

- [x] Classic Catan gameplay
- [x] 1-4 player support
- [x] Resource trading
- [x] Development cards
- [x] Longest road & largest army
- [x] Victory point tracking
- [x] Fishermen scenario
- [x] Explorers & Pirates expansion
- [x] Mobile debug console

## Future Expansions

- [ ] Cities & Knights
- [ ] Seafarers
- [ ] Trading & Harbors

## Mobile Debugging

Press the **Debug** button (bottom-left) to see:
- Console logs
- JavaScript errors with line numbers
- Warnings and messages
- Clear button to reset logs

This helps you spot issues while playing on mobile.
