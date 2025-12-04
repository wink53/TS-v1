/**
 * Sprite Sheet Analyzer
 * Automatically detects sprite boundaries in a sprite sheet image
 */

export interface SpriteFrame {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface SpriteSheetAnalysis {
    frames: SpriteFrame[];
    suggestedFrameSize: { width: number; height: number };
    layout: 'horizontal' | 'vertical' | 'grid';
    rows: number;
    columns: number;
}

/**
 * Analyzes a sprite sheet image and detects individual sprite frames
 * Uses grid-based detection when expected dimensions are provided
 */
export async function analyzeSpriteSheet(
    image: HTMLImageElement,
    options: {
        expectedFrameWidth?: number;
        expectedFrameHeight?: number;
        expectedFrameCount?: number;
        minWidth?: number;
        minHeight?: number;
        alphaThreshold?: number;
    } = {}
): Promise<SpriteSheetAnalysis> {
    const {
        expectedFrameWidth,
        expectedFrameHeight,
        expectedFrameCount,
        minWidth = 8,
        minHeight = 8,
        alphaThreshold = 10
    } = options;

    // Create a canvas to read pixel data
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Draw the image
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Helper function to check if a pixel is opaque
    const isOpaque = (x: number, y: number): boolean => {
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
        const index = (y * canvas.width + x) * 4;
        return pixels[index + 3] > alphaThreshold; // Check alpha channel
    };

    let frames: SpriteFrame[] = [];

    // Use grid-based detection if expected dimensions are provided
    if (expectedFrameWidth && expectedFrameHeight && expectedFrameCount) {
        console.log('🔍 Using grid-based detection:', expectedFrameWidth, 'x', expectedFrameHeight);

        const cols = Math.floor(canvas.width / expectedFrameWidth);
        const rows = Math.ceil(expectedFrameCount / cols);

        console.log('📐 Grid:', rows, 'rows x', cols, 'columns');

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const frameIndex = row * cols + col;
                if (frameIndex >= expectedFrameCount) break;

                const cellX = col * expectedFrameWidth;
                const cellY = row * expectedFrameHeight;

                // Find actual sprite bounds within this cell
                const bounds = findSpriteInCell(
                    cellX, cellY,
                    expectedFrameWidth, expectedFrameHeight,
                    isOpaque, minWidth, minHeight
                );

                if (bounds) {
                    frames.push(bounds);
                    console.log(`✓ Frame ${frameIndex}: (${bounds.x}, ${bounds.y}) ${bounds.width}x${bounds.height}`);
                } else {
                    console.warn(`⚠ Frame ${frameIndex}: no sprite in cell, using full cell`);
                    frames.push({
                        x: cellX,
                        y: cellY,
                        width: expectedFrameWidth,
                        height: expectedFrameHeight
                    });
                }
            }
        }
    } else {
        // Fallback to flood-fill if no grid info
        console.log('🔍 Using flood-fill detection');
        const visited = Array(canvas.height).fill(null).map(() => Array(canvas.width).fill(false));

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                if (!visited[y][x] && isOpaque(x, y)) {
                    const bounds = findSpriteBounds(x, y, visited, isOpaque, canvas.width, canvas.height);
                    if (bounds.width >= minWidth && bounds.height >= minHeight) {
                        frames.push(bounds);
                    }
                }
            }
        }
    }

    // Sort frames by position (top to bottom, left to right)
    frames.sort((a, b) => {
        if (Math.abs(a.y - b.y) < 5) { // Same row (within 5px tolerance)
            return a.x - b.x;
        }
        return a.y - b.y;
    });

    // Analyze layout
    const analysis = analyzeLayout(frames, canvas.width, canvas.height);

    console.log('🔍 Sprite Sheet Analysis:', {
        totalFrames: frames.length,
        layout: analysis.layout,
        rows: analysis.rows,
        columns: analysis.columns,
        suggestedFrameSize: analysis.suggestedFrameSize
    });

    return {
        frames,
        ...analysis
    };
}

/**
 * Finds the bounding box of a sprite within a specific grid cell
 */
function findSpriteInCell(
    cellX: number,
    cellY: number,
    cellWidth: number,
    cellHeight: number,
    isOpaque: (x: number, y: number) => boolean,
    minWidth: number,
    minHeight: number
): SpriteFrame | null {
    let minX = cellX + cellWidth;
    let minY = cellY + cellHeight;
    let maxX = cellX;
    let maxY = cellY;
    let foundPixels = false;

    // Scan the cell to find bounds of opaque pixels
    for (let y = cellY; y < cellY + cellHeight; y++) {
        for (let x = cellX; x < cellX + cellWidth; x++) {
            if (isOpaque(x, y)) {
                foundPixels = true;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (!foundPixels) return null;

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    if (width < minWidth || height < minHeight) return null;

    return { x: minX, y: minY, width, height };
}

/**
 * Finds the bounding box of a sprite starting from a given pixel
 */
function findSpriteBounds(
    startX: number,
    startY: number,
    visited: boolean[][],
    isOpaque: (x: number, y: number) => boolean,
    width: number,
    height: number
): SpriteFrame {
    let minX = startX;
    let minY = startY;
    let maxX = startX;
    let maxY = startY;

    // Use a queue for breadth-first search
    const queue: [number, number][] = [[startX, startY]];
    visited[startY][startX] = true;

    while (queue.length > 0) {
        const [x, y] = queue.shift()!;

        // Update bounds
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);

        // Check all 4 neighbors
        const neighbors = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1]
        ];

        for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
                !visited[ny][nx] && isOpaque(nx, ny)) {
                visited[ny][nx] = true;
                queue.push([nx, ny]);
            }
        }
    }

    return {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
    };
}

/**
 * Analyzes the layout pattern of detected frames
 */
function analyzeLayout(
    frames: SpriteFrame[],
    sheetWidth: number,
    sheetHeight: number
): Omit<SpriteSheetAnalysis, 'frames'> {
    if (frames.length === 0) {
        return {
            suggestedFrameSize: { width: 32, height: 32 },
            layout: 'horizontal',
            rows: 1,
            columns: 0
        };
    }

    // Find most common frame size
    const frameSizes = frames.map(f => ({ width: f.width, height: f.height }));
    const suggestedFrameSize = getMostCommonSize(frameSizes);

    // Detect layout pattern
    const firstRowFrames = frames.filter(f => Math.abs(f.y - frames[0].y) < 5);
    const firstColFrames = frames.filter(f => Math.abs(f.x - frames[0].x) < 5);

    let layout: 'horizontal' | 'vertical' | 'grid';
    let rows: number;
    let columns: number;

    if (firstRowFrames.length === frames.length) {
        // All frames in one row
        layout = 'horizontal';
        rows = 1;
        columns = frames.length;
    } else if (firstColFrames.length === frames.length) {
        // All frames in one column
        layout = 'vertical';
        rows = frames.length;
        columns = 1;
    } else {
        // Grid layout
        layout = 'grid';
        columns = firstRowFrames.length;
        rows = Math.ceil(frames.length / columns);
    }

    return {
        suggestedFrameSize,
        layout,
        rows,
        columns
    };
}

/**
 * Finds the most common size in an array of sizes
 */
function getMostCommonSize(sizes: { width: number; height: number }[]): { width: number; height: number } {
    const sizeMap = new Map<string, { size: { width: number; height: number }; count: number }>();

    for (const size of sizes) {
        const key = `${size.width}x${size.height}`;
        const entry = sizeMap.get(key);
        if (entry) {
            entry.count++;
        } else {
            sizeMap.set(key, { size, count: 1 });
        }
    }

    let mostCommon = sizes[0];
    let maxCount = 0;

    for (const { size, count } of sizeMap.values()) {
        if (count > maxCount) {
            maxCount = count;
            mostCommon = size;
        }
    }

    return mostCommon;
}
