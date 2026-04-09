# Rule Directory - Read ONLY the file you need

## IMPORTANT: Lazy Loading System
Do NOT read all files. Only read the one that matches the user's current request.

## Rule File Mapping

### Project Setup & Running
- **When**: User asks to run project, start services, setup environment
- **Read**: `.ai-docs/run-project.md`

### Frontend Development (Vidhyam & SuperAdmin)
- **When**: Working on React components, UI, CSS, frontend features
- **Read**: `.ai-docs/frontend-ui.md`

### Backend Development
- **When**: Working on Rust backend, APIs, database, services
- **Read**: `.ai-docs/backend-arch.md`

### Mobile Apps (Flutter)
- **When**: Working on Chatra or Employee mobile apps
- **Read**: `.ai-docs/mobile-apps.md`

### Project Architecture
- **When**: Need overview of project structure, components, relationships
- **Read**: `.ai-docs/project-map.md`

### Feature Tracking & Progress
- **When**: Need to check feature completion status, pending tasks, or progress tracking
- **Read**: `.ai-docs/feature-tracking/feature-progress.md`

## How to Use This System
1. When user gives a task, determine which category it falls into
2. Use `read_file` tool to read ONLY the corresponding `.ai-docs/` file
3. Do NOT read any other rule files unless specifically needed
4. Keep context window clean - only load what's necessary
5. Token-saver rules apply to all prompts (automatically loaded from `.roo/rules/token-saver.md`)

## Benefits
- Zero input token waste on new sessions
- On-demand reading based on task
- Clean context window with only relevant rules
- Faster AI response times
- Lower token costs