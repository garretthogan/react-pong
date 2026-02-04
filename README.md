# 3D Pong Game

A modern single-player 3D Pong game built with React, Three.js, and react-three-fiber.

## Features

- **3D Graphics**: Full 3D rendering using WebGL through react-three-fiber
- **Single Player Mode**: Play against an AI opponent
- **Smooth Controls**: Control your paddle with mouse movement or keyboard (Arrow Keys / A-D)
- **Real-time Physics**: Ball bounces realistically off paddles and walls
- **Score Tracking**: Keep track of player vs AI scores
- **Interactive Camera**: OrbitControls allow you to adjust the viewing angle

## Controls

- **Mouse**: Move your mouse left/right to control the paddle
- **Keyboard**: Use Arrow Keys (←/→) or A/D keys for paddle control

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Run the Game

```bash
npm run dev
```

Open your browser and navigate to the local development server (typically `http://localhost:5173`)

### Build for Production

```bash
npm run build
```

## Technologies Used

- **React 19**: UI framework
- **Three.js**: 3D graphics library
- **react-three-fiber**: React renderer for Three.js
- **@react-three/drei**: Useful helpers for react-three-fiber
- **Vite**: Fast build tool and dev server

## Game Mechanics

- The ball increases speed with each successful hit
- The AI opponent tracks the ball's position with slight delay for balanced difficulty
- Paddle collisions affect ball trajectory based on where the ball hits
- Score a point when the ball passes your opponent's paddle

## License

MIT

Enjoy the game!
