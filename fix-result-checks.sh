#!/bin/bash

# Fix TilesView.tsx
sed -i '' 's/if (result\.__kind__ === .ok.)/if ("ok" in result)/' "/Users/wayneeastman/Library/Mobile Documents/com~apple~CloudDocs/ICP DEV/tile-smith-backend-data-layer--10-/frontend/src/pages/TilesView.tsx"

# Fix ObjectsView.tsx
sed -i '' 's/if (result\.__kind__ === .ok.)/if ("ok" in result)/' "/Users/wayneeastman/Library/Mobile Documents/com~apple~CloudDocs/ICP DEV/tile-smith-backend-data-layer--10-/frontend/src/pages/ObjectsView.tsx"

# Fix TileSetsView.tsx
sed -i '' 's/if (result\.__kind__ === .ok.)/if ("ok" in result)/' "/Users/wayneeastman/Library/Mobile Documents/com~apple~CloudDocs/ICP DEV/tile-smith-backend-data-layer--10-/frontend/src/pages/TileSetsView.tsx"

# Fix PrefabsView.tsx
sed -i '' 's/if (result\.__kind__ === .ok.)/if ("ok" in result)/' "/Users/wayneeastman/Library/Mobile Documents/com~apple~CloudDocs/ICP DEV/tile-smith-backend-data-layer--10-/frontend/src/pages/PrefabsView.tsx"

# Fix MapsView.tsx
sed -i '' 's/if (result\.__kind__ === .ok.)/if ("ok" in result)/' "/Users/wayneeastman/Library/Mobile Documents/com~apple~CloudDocs/ICP DEV/tile-smith-backend-data-layer--10-/frontend/src/pages/MapsView.tsx"

echo "Fixed all Result type checks"
