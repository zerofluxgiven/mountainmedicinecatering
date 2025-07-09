# AI Agents & Context Guide

This file serves as a central index for AI agents (Claude, GPT, etc.) to quickly understand the Mountain Medicine Catering codebase and find relevant documentation.

## 🚀 Quick Start for AI Agents

If you're an AI assistant working on this codebase, start here:

1. **Read `CLAUDE.md`** - Complete architecture reference (993 lines)
2. **Check current branch**: `git branch --show-current`
3. **Review recent changes**: `git log --oneline -10`
4. **Understand the project state**: Read the relevant guides below

## 📚 Essential Documentation Files

### Architecture & Codebase

| File | Purpose | When to Read |
|------|---------|--------------|
| **[CLAUDE.md](./CLAUDE.md)** | Complete system architecture, all modules, functions, patterns | **ALWAYS READ FIRST** |
| **[FUNCTION_REFERENCE.md](./FUNCTION_REFERENCE.md)** | Every function signature with examples | When implementing features |
| **[RECENT_CHANGES.md](./RECENT_CHANGES.md)** | Latest updates to sync between repos | When switching branches |

### React Migration

| File | Purpose | When to Read |
|------|---------|--------------|
| **[REACT_MIGRATION_ROADMAP.md](./REACT_MIGRATION_ROADMAP.md)** | 4-week migration plan from Streamlit to React | Planning React work |
| **[REACT_CONVERSION_CONTEXT.md](./REACT_CONVERSION_CONTEXT.md)** | Quick context for React migration | When context resets |
| **[react-app/README.md](./react-app/README.md)** | React app setup and structure | Working on React code |

### Testing

| File | Purpose | When to Read |
|------|---------|--------------|
| **[react-app/TESTING_GUIDE.md](./react-app/TESTING_GUIDE.md)** | Complete testing how-to guide | Before running tests |
| **[react-app/TESTING_STRATEGY.md](./react-app/TESTING_STRATEGY.md)** | Testing approach and examples | Planning test coverage |
| **[react-app/MANUAL_TESTING_CHECKLIST.md](./react-app/MANUAL_TESTING_CHECKLIST.md)** | Pre-deployment checklist | Before deployment |

### Sync & Workflow

| File | Purpose | When to Read |
|------|---------|--------------|
| **[SYNC_SUMMARY.md](./SYNC_SUMMARY.md)** | Files synced to kitchen repo | After repo sync |
| **[RECIPE_SCALING_FIX.md](./RECIPE_SCALING_FIX.md)** | Recent scaling bug fix details | Debugging scaling |

## 🏗️ Project Structure

```
mountainmedicinecatering/          # Main Streamlit app
├── CLAUDE.md                      # START HERE - Complete reference
├── FUNCTION_REFERENCE.md          # All functions documented
├── react-app/                     # React migration
│   ├── src/                       # React source code
│   ├── TESTING_GUIDE.md          # How to test
│   └── README.md                 # React setup
└── mountainmedicine-kitchen/      # Parallel repo (sync target)
```

## 🔄 Current Status

### Active Development
- **Current Branch**: Use `git branch --show-current`
- **Main Branch**: `main`
- **Active Feature Branch**: `fix/parsing-and-data-consistency`

### Technology Stack
- **Current Production**: Streamlit + Firebase
- **Migration Target**: React + Firebase (same backend)
- **Deployment**: Firebase Hosting via GitHub Actions

## 🎯 Common Tasks

### For Streamlit Development
1. Read `CLAUDE.md` sections on module organization
2. Check `FUNCTION_REFERENCE.md` for existing functions
3. Follow patterns in existing Python files

### For React Development
1. Read `REACT_MIGRATION_ROADMAP.md` for current phase
2. Check `react-app/README.md` for setup
3. Run tests with `react-app/TESTING_GUIDE.md`

### For Bug Fixes
1. Check `RECENT_CHANGES.md` for related updates
2. Read specific module docs in `CLAUDE.md`
3. Add tests following `TESTING_STRATEGY.md`

### For New Features
1. Understand architecture in `CLAUDE.md`
2. Check both Streamlit and React implementations
3. Update relevant documentation

## 💡 Key Concepts to Understand

1. **Event Context System**: Most operations require a selected event
2. **Authentication Flow**: Firebase Auth with role-based permissions
3. **Recipe Scaling**: Smart ingredient parsing and fraction handling
4. **Mobile Support**: Separate mobile components and detection
5. **AI Integration**: OpenAI for parsing recipes and chat

## 🔧 Development Commands

```bash
# Streamlit app
streamlit run app.py

# React app
cd react-app
npm install
npm start

# Run all React tests
cd react-app
./run-tests.sh

# Check git status
git status
git log --oneline -10
```

## 📋 Checklist for AI Agents

When starting work:
- [ ] Read `CLAUDE.md` for architecture understanding
- [ ] Check current git branch and recent commits
- [ ] Review relevant documentation for your task
- [ ] Understand both Streamlit and React versions
- [ ] Run tests if modifying code
- [ ] Update documentation if adding features

## 🚨 Important Notes

1. **Two Repos Exist**: Main app and kitchen repo (for parallel development)
2. **Same Firebase**: Both Streamlit and React use the same backend
3. **Gradual Migration**: React app supplements, doesn't replace Streamlit yet
4. **Test Everything**: Comprehensive testing infrastructure in place
5. **Document Changes**: Update relevant .md files when making changes

---

**Remember**: When in doubt, `CLAUDE.md` has the answers. It's the single source of truth for the entire application architecture.