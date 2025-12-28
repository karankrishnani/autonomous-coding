#!/usr/bin/env python3
"""
Simple CLI launcher for the Autonomous Coding Agent.
Provides an interactive menu to create new projects or continue existing ones.
"""

import os
import sys
import subprocess
from pathlib import Path


# Directory containing prompt files
PROMPTS_DIR = Path(__file__).parent / "prompts"


def check_spec_exists() -> bool:
    """Check if valid spec files exist."""
    app_spec = PROMPTS_DIR / "app_spec.txt"
    if not app_spec.exists():
        return False
    content = app_spec.read_text(encoding="utf-8")
    return "<project_specification>" in content


def get_existing_projects() -> list[str]:
    """Get list of existing projects from generations folder."""
    generations_dir = Path("generations")
    if not generations_dir.exists():
        return []

    projects = []
    for item in generations_dir.iterdir():
        if item.is_dir() and not item.name.startswith('.'):
            projects.append(item.name)

    return sorted(projects)


def display_menu(projects: list[str]) -> None:
    """Display the main menu."""
    print("\n" + "=" * 50)
    print("  Autonomous Coding Agent Launcher")
    print("=" * 50)
    print("\n[1] Create new project")

    if projects:
        print("[2] Continue existing project")

    print("[q] Quit")
    print()


def display_projects(projects: list[str]) -> None:
    """Display list of existing projects."""
    print("\n" + "-" * 40)
    print("  Existing Projects")
    print("-" * 40)

    for i, project in enumerate(projects, 1):
        print(f"  [{i}] {project}")

    print("\n  [b] Back to main menu")
    print()


def get_project_choice(projects: list[str]) -> str | None:
    """Get user's project selection."""
    while True:
        choice = input("Select project number: ").strip().lower()

        if choice == 'b':
            return None

        try:
            idx = int(choice) - 1
            if 0 <= idx < len(projects):
                return projects[idx]
            print(f"Please enter a number between 1 and {len(projects)}")
        except ValueError:
            print("Invalid input. Enter a number or 'b' to go back.")


def get_new_project_name() -> str | None:
    """Get name for new project."""
    print("\n" + "-" * 40)
    print("  Create New Project")
    print("-" * 40)
    print("\nEnter project name (e.g., my-awesome-app)")
    print("Leave empty to cancel.\n")

    name = input("Project name: ").strip()

    if not name:
        return None

    # Basic validation
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        if char in name:
            print(f"Invalid character '{char}' in project name")
            return None

    return name


def run_spec_creation() -> bool:
    """Run Claude Code with /create-spec command to create project specification."""
    print("\n" + "=" * 50)
    print("  Project Specification Setup")
    print("=" * 50)
    print("\nLaunching Claude Code for interactive spec creation...")
    print("Answer the questions to define your project.")
    print("When done, Claude will generate the spec files.")
    print("Exit Claude Code (Ctrl+C or /exit) when finished.\n")

    try:
        # Launch Claude Code with /create-spec command
        # This blocks until user exits Claude Code
        subprocess.run(
            ["claude", "/create-spec"],
            check=False,  # Don't raise on non-zero exit
            cwd=str(Path(__file__).parent)  # Run from project root
        )

        # Check if spec was created
        if check_spec_exists():
            print("\n" + "-" * 50)
            print("Spec files created successfully!")
            return True
        else:
            print("\n" + "-" * 50)
            print("Spec creation incomplete. Please try again.")
            return False

    except FileNotFoundError:
        print("\nError: 'claude' command not found.")
        print("Make sure Claude Code CLI is installed:")
        print("  npm install -g @anthropic-ai/claude-code")
        return False
    except KeyboardInterrupt:
        print("\n\nSpec creation cancelled.")
        return False


def ask_spec_creation_choice() -> str | None:
    """Ask user whether to create spec with Claude or skip."""
    print("\n" + "-" * 40)
    print("  Specification Setup")
    print("-" * 40)
    print("\nHow would you like to define your project?")
    print("\n[1] Create spec with Claude (recommended)")
    print("    Interactive conversation to define your project")
    print("\n[2] Skip - use existing spec")
    print("    Use manually edited app_spec.txt and initializer_prompt.md")
    print("\n[b] Back to main menu")
    print()

    while True:
        choice = input("Select [1/2/b]: ").strip().lower()
        if choice in ['1', '2', 'b']:
            return choice
        print("Invalid choice. Please enter 1, 2, or b.")


def create_new_project_flow() -> str | None:
    """Get project name and optionally create spec."""
    project_name = get_new_project_name()
    if not project_name:
        return None

    # Ask user how they want to handle spec creation
    choice = ask_spec_creation_choice()

    if choice == 'b':
        return None
    elif choice == '1':
        # Create spec with Claude
        success = run_spec_creation()
        if not success:
            return None
    elif choice == '2':
        # Skip - verify spec exists
        if check_spec_exists():
            print("\nUsing existing spec files.")
        else:
            print("\nWarning: No valid spec found in prompts/app_spec.txt")
            print("The agent may not work correctly without a spec.")
            confirm = input("Continue anyway? [y/N]: ").strip().lower()
            if confirm != 'y':
                return None

    return project_name


def run_agent(project_name: str) -> None:
    """Run the autonomous agent with the given project."""
    print(f"\nStarting agent for project: {project_name}")
    print("-" * 50)

    # Build the command
    cmd = [sys.executable, "autonomous_agent_demo.py", "--project-dir", project_name]

    # Run the agent
    try:
        subprocess.run(cmd, check=False)
    except KeyboardInterrupt:
        print("\n\nAgent interrupted. Run again to resume.")


def main() -> None:
    """Main entry point."""
    # Ensure we're in the right directory
    script_dir = Path(__file__).parent.absolute()
    os.chdir(script_dir)

    while True:
        projects = get_existing_projects()
        display_menu(projects)

        choice = input("Select option: ").strip().lower()

        if choice == 'q':
            print("\nGoodbye!")
            break

        elif choice == '1':
            project_name = create_new_project_flow()
            if project_name:
                run_agent(project_name)

        elif choice == '2' and projects:
            display_projects(projects)
            selected = get_project_choice(projects)
            if selected:
                run_agent(selected)

        else:
            print("Invalid option. Please try again.")


if __name__ == "__main__":
    main()
