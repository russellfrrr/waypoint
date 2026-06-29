# Waypoint

Waypoint is an open-source VS Code extension that helps developers understand unfamiliar codebases through static analysis and contextual insights. It aims to reduce onboarding time by making project structure, dependencies, and code relationships easier to explore directly inside the editor.

## Motivation

Every developer has experienced opening a new repository and asking:

- Where do I even start?
- What does this file do?
- What depends on this module?
- Where is this used?

Waypoint exists to answer those questions without forcing developers to manually search through dozens of files.

## Current Features

- Analyze the currently active file
- Display file metadata (name, path, language, line count)
- Extract imported modules
- Extract exported declarations
- Display analysis in a dedicated VS Code output channel

## Roadmap

### V1 - Static Code Analysis
- [x] Analyze active file
- [x] Extract imports
- [x] Extract exports
- [x] Output analysis in VS Code
- [ ] Hover over file paths and imports to view summaries
- [ ] Show incoming and outgoing dependencies
- [ ] Navigate between related files

### V2 - AI-Assisted Insights
- [ ] Generate concise file summaries
- [ ] Explain unfamiliar modules
- [ ] Recommend which files to read next
- [ ] Summarize project architecture

### Future Vision
- Language-agnostic support
- Interactive dependency graphs
- Project onboarding mode
- Codebase health metrics
- Team knowledge integration

## Why Waypoint?

Waypoint isn't intended to replace documentation.

Instead, it acts as a navigation layer that helps developers quickly understand how a project is structured and how its pieces fit together.

## Tech Stack

- TypeScript
- VS Code Extension API
- ts-morph

## Running Locally

```bash
pnpm install
pnpm run compile
```