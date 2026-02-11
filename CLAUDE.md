# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains two main components:

1. **Autonomous Coding Agent** (root level): A long-running autonomous coding agent powered by the Claude Agent SDK that builds complete applications over multiple sessions using a two-agent pattern.

2. **Generated Projects** (in `generations/`): Applications built by the autonomous agent. Each generated project lives in its own subdirectory.

## Common Commands

### Autonomous Agent (Root Level)

```bash
# Start the autonomous agent (interactive menu)
./start.sh                    # macOS/Linux
start.bat                     # Windows

# Run the agent directly
python autonomous_agent_demo.py --project <project-name>
```

## Architecture

### Autonomous Agent (Two-Agent Pattern)

1. **Initializer Agent** (first session): Reads app spec, generates `feature_list.json` with test cases, sets up project structure
2. **Coding Agent** (subsequent sessions): Picks up from previous session, implements features, marks them passing in `feature_list.json`

Key files:
- `agent.py` - Core agent session logic
- `client.py` - Claude SDK client configuration
- `security.py` - Bash command allowlist and validation
- `prompts.py` - Prompt template loading with project-specific fallback
- `.claude/templates/` - Base prompt templates

Security model uses an allowlist approach - only explicitly permitted bash commands can run (see `ALLOWED_COMMANDS` in `security.py`).
