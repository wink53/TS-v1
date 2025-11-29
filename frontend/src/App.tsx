import './index.css';

function App() {
    return (
        <div className="app">
            <div className="container">
                <div className="logo">
                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                        <rect x="10" y="10" width="20" height="20" fill="#3b82f6" />
                        <rect x="35" y="10" width="20" height="20" fill="#8b5cf6" />
                        <rect x="60" y="10" width="20" height="20" fill="#ec4899" />
                        <rect x="10" y="35" width="20" height="20" fill="#10b981" />
                        <rect x="35" y="35" width="20" height="20" fill="#f59e0b" />
                        <rect x="60" y="35" width="20" height="20" fill="#ef4444" />
                        <rect x="10" y="60" width="20" height="20" fill="#06b6d4" />
                        <rect x="35" y="60" width="20" height="20" fill="#6366f1" />
                        <rect x="60" y="60" width="20" height="20" fill="#a855f7" />
                    </svg>
                </div>

                <h1>Tile Smith</h1>
                <p className="subtitle">Game Asset Management System</p>

                <div className="status">
                    <div className="status-indicator"></div>
                    <span>Backend Deployed Successfully</span>
                </div>

                <div className="features">
                    <div className="feature">
                        <h3>🎨 Tiles</h3>
                        <p>32×32 pixel PNG assets with validation</p>
                    </div>
                    <div className="feature">
                        <h3>🎮 Objects</h3>
                        <p>Multi-state game objects with collision</p>
                    </div>
                    <div className="feature">
                        <h3>📦 Tile Sets</h3>
                        <p>Organized collections of tiles</p>
                    </div>
                    <div className="feature">
                        <h3>🔧 Prefabs</h3>
                        <p>Pre-configured object templates</p>
                    </div>
                    <div className="feature">
                        <h3>🗺️ Maps</h3>
                        <p>Complete game level layouts</p>
                    </div>
                </div>

                <div className="info">
                    <p>Frontend UI coming soon...</p>
                    <p className="tech">Built on Internet Computer Protocol</p>
                </div>
            </div>
        </div>
    );
}

export default App;
