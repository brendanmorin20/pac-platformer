Pac-Platformer
1. What This Game Is

Pac-Platformer is a web-based, side-view 2D platformer game starring an original, Pac-Man-inspired round hero (not the copyrighted Pac-Man character — a new design built for this project). The player runs, jumps, and dodges hazards across three hand-built levels, collecting coins and reaching a goal to progress. The backend is built in Python using Flask; the frontend is HTML5 Canvas with vanilla JavaScript for rendering, physics, and gameplay logic.

2. Installing the Required Software

You'll need:

Python 3.9 or newer — download from https://www.python.org/downloads/ if you don't already have it. During installation on Windows, check the box that says "Add Python to PATH."
pip (Python's package manager) — this is included automatically with modern Python installs.

To confirm both are installed, open a terminal and run:

python --version
pip --version

3. Installing Python Dependencies
- Clone or download this repository, then open a terminal in the project folder:
git clone https://github.com/brendanmorin20/pac-platformer.git
cd pac-platformer
Create a virtual environment (keeps this project's packages separate from the rest of your system):
python -m venv venv
Activate it:
Windows: venv\Scripts\activate
macOS/Linux: source venv/bin/activate
Install the required packages:
pip install -r requirements.txt

4. Starting the Web Application

With your virtual environment activated, run:

python app.py

This starts a local Flask development server. Leave this terminal window open while you play — closing it shuts down the server.

5. What URL to Open

Open a web browser and go to:

http://127.0.0.1:5000

6. Keyboard Controls
Key	Action
← or A	Move left
→ or D	Move right
Space, ↑, or W	Jump
R	Restart the current level
P or Esc	Pause / resume

7. How to Play
From the title screen, click Start Game. Move your character across each level, collecting coins and avoiding hazards and falls. Each level has a visible progress bar, a lives counter, and a coin counter. You have 3 lives. If you touch a hazard or fall off the level it costs a life and respawns you at the last checkpoint you passed. Run out of lives and it's game over. You have to start again. Reach the goal flag at the end of a level to complete it and move to the next one. Clear all three levels to win the game and submit your score to the high-score leaderboard on the title screen.


8. How the Levels Work

Each level is defined is a JSON file (levels/level1.json, level2.json, level3.json) There are moving platforms, hazards, coins, checkpoints, and the goal location.


9. What Python Does in This Application

Python (via Flask) runs the entire backend of this game:

Serves the main webpage and all static assets (JavaScript, CSS).
Loads level data as JSON through a REST API (/api/levels/<n>), rejecting any malformed level file before it reaches the browser.

Tracks the high-score leaderboard to a local file (scores.json), 

validating (/api/scores).

The actual gameplay rendering, physics, and controls run client-side in JavaScript in the browser, while Python/Flask is responsible for serving the application and managing its data.


10. AI Tools Used

This project was built with the assistance of Claude, which helped write the Python/Flask backend and JavaScript frontend code. Helped troubleshoot platforms, coins, and hazard placements based on testing and feedback. 
