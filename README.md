# Tile Smith - Game Asset Management System

A full-stack application for managing tile-based game assets on the Internet Computer Protocol (ICP).

## Features

- **Tiles**: 32×32 pixel PNG assets with strict validation
- **Objects**: Multi-state game objects with anchors and collision detection
- **Tile Sets**: Organized collections of related tiles
- **Prefabs**: Pre-configured object templates
- **Maps**: Complete map layouts with positioned tiles and objects

## Deployment with ICP Ninja

This project is configured for deployment via ICP Ninja.

### Prerequisites

1. Upload your project to ICP Ninja
2. ICP Ninja will automatically detect the `dfx.json` configuration

### Build Process

ICP Ninja will:
1. Install frontend dependencies (`npm install` in the `frontend` directory)
2. Build the frontend (`npm run build`)
3. Compile the Motoko backend
4. Deploy both canisters to the Internet Computer

### Known Issues

⚠️ **Blob Storage**: The blob storage functionality is currently commented out in `backend/main.mo`. Once deployed, we'll need to configure proper ICP blob storage for PNG asset uploads.

## Project Structure

```
tile-smith-backend-data-layer--10-/
├── dfx.json                 # ICP canister configuration
├── backend/
│   ├── main.mo             # Motoko backend (blob storage disabled)
│   └── migration.mo        # Data migration utilities
└── frontend/
    ├── package.json        # Frontend dependencies
    ├── vite.config.ts      # Vite build configuration
    ├── tsconfig.json       # TypeScript configuration
    ├── src/
    │   ├── App.tsx         # Main application
    │   ├── pages/          # View components
    │   └── components/     # UI components
    └── dist/               # Build output (generated)
```

## Technology Stack

- **Backend**: Motoko (ICP)
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + Custom components

## Next Steps After Deployment

1. ✅ Verify both canisters deployed successfully
2. ✅ Test the frontend loads in browser
3. 🔧 Configure blob storage for PNG asset uploads
4. 🔧 Implement asset validation logic
5. 🔧 Connect frontend to backend API

## Documentation

See `spec.md` for detailed backend data layer specifications.
