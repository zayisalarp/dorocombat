# ⚔️ Doro Combat

An interactive animated combat arena featuring battling fighters with real-time physics, continuous clashing, and a sleek minimalist HUD.

## ✨ Features

- **Autonomous Fighter Combat**: Animated fighters drift, patrol, hunt, and execute high-speed lunge attacks.
- **Continuous Clashing**: Elastic bouncing, damage popups, spark bursts, and instant shield recharges (no disappearing or teleporting).
- **Team Brawling**: Cyan vs Red faction scoring tracked in real time.
- **Player Interaction**:
  - Click anywhere on empty stage to spawn new fighters.
  - Click and drag any fighter to throw them like a bowling ball into enemy crowds.
  - Sound effects toggle with synthesized Web Audio FX.
- **60+ FPS Performance**: Hardware-accelerated GPU transforms and optimized vector canvas rendering.
- **Minimalist Top Bar**: Sleek floating glassmorphism capsule with live scoreboard, FPS counter, fighter tally, and sound controls.

## 🚀 Quick Start

### Option 1: Direct in Browser
Open `index.html` directly in your favorite modern web browser.

### Option 2: Local Server
Run with Node.js:
```bash
node server.js
```
Then visit `http://localhost:3000`.

## 📁 Project Structure

- `4x.avif` - Primary animated combat sprite asset
- `index.html` - Semantic HTML5 battle arena structure & minimal HUD
- `style.css` - GPU-accelerated styling & responsive design
- `script.js` - Combat AI simulation, physics engine, and audio synthesizer
- `server.js` - Zero-dependency Node.js HTTP server
