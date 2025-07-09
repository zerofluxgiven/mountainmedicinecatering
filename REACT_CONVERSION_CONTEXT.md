# React Conversion Context Guide

## Quick Start (When Context Resets)
1. We're converting Mountain Medicine Catering from Streamlit to React
2. Two repos exist:
   - Current: `/Documents/mountainmedicinecatering` (Streamlit, actively used)
   - Target: `/mountainmedicine-kitchen/mountainmedicine-kitchen` (has React skeleton)
3. Kitchen repo is missing recent changes - needs sync first
4. Plan: Build React version while keeping Streamlit running

## Current Status
- [ ] Sync recent changes to kitchen repo
- [ ] Extract React skeleton from zip
- [ ] Set up Firebase Functions
- [ ] Create first React component
- [ ] Test Firebase connection

## Key Technical Details
- **Firebase**: Same project/credentials for both apps
- **Hosting**: React at different path to avoid conflicts
- **Auth**: Reuse existing Firebase Auth
- **Database**: Same Firestore instance
- **Storage**: Same bucket, same paths

## Critical Files to Reference
1. `REACT_MIGRATION_ROADMAP.md` - Full project plan
2. `RECENT_CHANGES.md` - What needs syncing
3. `CLAUDE.md` - Current app architecture
4. This file - Quick context restoration

## Common Commands
```bash
# Check current branch
git branch --show-current

# See recent changes
git log --oneline -10

# Find React files
find . -name "*.jsx" -o -name "*.tsx"

# Check Python dependencies
cat requirements.txt
```

## Important Patterns to Maintain
1. **Event Context**: Most operations require selected event
2. **Role Permissions**: Check user role before operations
3. **Mobile First**: Responsive design critical
4. **AI Integration**: OpenAI for parsing, chat
5. **Error Handling**: User-friendly error messages

## Conversion Priorities
1. Core functionality first (recipes, events)
2. Match existing UI/UX patterns
3. Maintain data model consistency
4. Progressive enhancement approach

## When Stuck
- Check existing Python implementation
- Maintain same business logic
- Use Firebase SDK docs
- Keep user workflows identical

---
Remember: We're building in parallel, not replacing immediately!