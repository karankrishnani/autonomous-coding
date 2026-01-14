#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo "========================================"
echo "  Autonomous Coding Agent"
echo "========================================"
echo ""

# Check if Claude CLI is installed
if ! command -v claude &> /dev/null; then
    echo "[ERROR] Claude CLI not found"
    echo ""
    echo "Please install Claude CLI first:"
    echo "  curl -fsSL https://claude.ai/install.sh | bash"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "[OK] Claude CLI found"

# Check if user has credentials
CLAUDE_CREDS="$HOME/.claude.json"
if [ -f "$CLAUDE_CREDS" ]; then
    echo "[OK] Claude credentials found"
else
    echo "[!] Not authenticated with Claude"
    echo ""
    echo "You need to run 'claude login' to authenticate."
    echo "This will open a browser window to sign in."
    echo ""
    read -p "Would you like to run 'claude login' now? (y/n): " LOGIN_CHOICE

    if [[ "$LOGIN_CHOICE" =~ ^[Yy]$ ]]; then
        echo ""
        echo "Running 'claude login'..."
        echo "Complete the login in your browser, then return here."
        echo ""
        claude /login

        # Check if login succeeded
        if [ -f "$CLAUDE_CREDS" ]; then
            echo ""
            echo "[OK] Login successful!"
        else
            echo ""
            echo "[ERROR] Login failed or was cancelled."
            echo "Please try again."
            exit 1
        fi
    else
        echo ""
        echo "Please run 'claude login' manually, then try again."
        exit 1
    fi
fi

echo ""

# Initialize pyenv if available
if command -v pyenv &> /dev/null; then
    eval "$(pyenv init -)"
    if [ -f ".python-version" ]; then
        PYTHON_VERSION=$(cat .python-version)
        echo "Using Python version from .python-version: $PYTHON_VERSION"
        pyenv local "$PYTHON_VERSION" 2>/dev/null || true
        PYTHON_CMD=$(pyenv which python)
    else
        PYTHON_CMD=$(pyenv which python 2>/dev/null || command -v python3)
    fi
else
    PYTHON_CMD=$(command -v python3)
fi

if [ -z "$PYTHON_CMD" ]; then
    echo "[ERROR] Python not found"
    exit 1
fi

echo "Using Python: $PYTHON_CMD"
$PYTHON_CMD --version

# Check if venv exists, create if not
if [ ! -d "venv" ]; then
    echo "Creating virtual environment with $PYTHON_CMD..."
    $PYTHON_CMD -m venv venv
fi

# Activate the virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

echo "Has the virtual environment been activated?"
which python
python --version

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Run the app
python start.py
