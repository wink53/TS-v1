/**
 * Sprite Sheet Analyzer
 * Automatically detects sprite boundaries in a sprite sheet image
 */

export type DetectionMode = 'alpha' | 'blackBorder';

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
 * Scans the ENTIRE image to find sprites anywhere (not just top-left)
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
        detectionMode?: DetectionMode;
        blackThreshold?: number;
    } = {}
): Promise<SpriteSheetAnalysis> {
    const {
        expectedFrameWidth,
        expectedFrameHeight,
        expectedFrameCount,
        minWidth = 8,
        minHeight = 8,
        alphaThreshold = 10,
        detectionMode = 'alpha',
        blackThreshold = 15
    } = options;

    console.log(`🔍 Using detection mode: ${detectionMode}`);

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

    // Helper function to check if a pixel is content (not background)
    // Alpha mode: pixel is content if it has alpha > threshold
    // BlackBorder mode: pixel is content if it's NOT black (sprites are on black background)
    const isContent = (x: number, y: number): boolean => {
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
        const index = (y * canvas.width + x) * 4;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const a = pixels[index + 3];

        if (detectionMode === 'blackBorder') {
            // In black-border mode, content is anything that's NOT black
            // Black boxes are the borders, so we want non-black pixels
            const isBlack = r < blackThreshold && g < blackThreshold && b < blackThreshold;
            return a > alphaThreshold && !isBlack;
        } else {
            // Alpha mode: content is anything with alpha > threshold
            return a > alphaThreshold;
        }
    };

    // Helper to check if a pixel is black (for border detection)
    const isBlackPixel = (x: number, y: number): boolean => {
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
        const index = (y * canvas.width + x) * 4;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        return r < blackThreshold && g < blackThreshold && b < blackThreshold;
    };

    // Check if a cell has black border on all edges (indicating a boxed sprite)
    const hasCellBlackBorder = (cellX: number, cellY: number, width: number, height: number): boolean => {
        let blackEdgeCount = 0;
        const sampleCount = 8; // Sample 8 points per edge

        // Check top edge
        let topBlack = 0;
        for (let i = 0; i < sampleCount; i++) {
            const x = cellX + Math.floor((width * i) / sampleCount);
            if (isBlackPixel(x, cellY)) topBlack++;
        }
        if (topBlack >= sampleCount * 0.6) blackEdgeCount++;

        // Check bottom edge
        let bottomBlack = 0;
        for (let i = 0; i < sampleCount; i++) {
            const x = cellX + Math.floor((width * i) / sampleCount);
            if (isBlackPixel(x, cellY + height - 1)) bottomBlack++;
        }
        if (bottomBlack >= sampleCount * 0.6) blackEdgeCount++;

        // Check left edge
        let leftBlack = 0;
        for (let i = 0; i < sampleCount; i++) {
            const y = cellY + Math.floor((height * i) / sampleCount);
            if (isBlackPixel(cellX, y)) leftBlack++;
        }
        if (leftBlack >= sampleCount * 0.6) blackEdgeCount++;

        // Check right edge
        let rightBlack = 0;
        for (let i = 0; i < sampleCount; i++) {
            const y = cellY + Math.floor((height * i) / sampleCount);
            if (isBlackPixel(cellX + width - 1, y)) rightBlack++;
        }
        if (rightBlack >= sampleCount * 0.6) blackEdgeCount++;

        // Return true if at least 3 edges are black (allowing for some variation)
        return blackEdgeCount >= 3;
    };


    let frames: SpriteFrame[] = [];

    if (expectedFrameWidth && expectedFrameHeight && expectedFrameCount) {
        console.log('🔍 Scanning entire image for sprites...');

        // Scan ALL grid cells in the entire image, not just from top-left
        const totalCols = Math.floor(canvas.width / expectedFrameWidth);
        const totalRows = Math.floor(canvas.height / expectedFrameHeight);

        console.log('📐 Total grid cells:', totalRows, 'rows x', totalCols, 'columns');

        // Find all cells that contain sprites
        const spriteCells: SpriteFrame[] = [];

        for (let row = 0; row < totalRows; row++) {
            for (let col = 0; col < totalCols; col++) {
                const cellX = col * expectedFrameWidth;
                const cellY = row * expectedFrameHeight;

                // In blackBorder mode, only consider cells that have a black border
                if (detectionMode === 'blackBorder') {
                    if (!hasCellBlackBorder(cellX, cellY, expectedFrameWidth, expectedFrameHeight)) {
                        continue; // Skip cells without black borders
                    }
                }

                // Check if this cell has any content pixels
                const bounds = findSpriteInCell(
                    cellX, cellY,
                    expectedFrameWidth, expectedFrameHeight,
                    isContent, minWidth, minHeight
                );

                if (bounds) {
                    spriteCells.push(bounds);
                }
            }
        }

        console.log('📊 Found', spriteCells.length, 'cells with sprites');

        // Sort by position (top to bottom, left to right)
        spriteCells.sort((a, b) => {
            if (Math.abs(a.y - b.y) < expectedFrameHeight / 2) {
                return a.x - b.x;
            }
            return a.y - b.y;
        });

        // Take the first N frames based on expectedFrameCount
        frames = spriteCells.slice(0, expectedFrameCount);

        // Log what we found
        frames.forEach((f, i) => {
            console.log(`✓ Frame ${i}: (${f.x}, ${f.y}) ${f.width}x${f.height}`);
        });

        if (frames.length < expectedFrameCount) {
            console.warn(`⚠ Only found ${frames.length} sprites, expected ${expectedFrameCount}`);
        }
    } else {
        // Fallback to flood-fill if no grid info
        console.log('🔍 Using flood-fill detection');
        const visited = Array(canvas.height).fill(null).map(() => Array(canvas.width).fill(false));

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                if (!visited[y][x] && isContent(x, y)) {
                    const bounds = findSpriteBounds(x, y, visited, isContent, canvas.width, canvas.height);
                    if (bounds.width >= minWidth && bounds.height >= minHeight) {
                        frames.push(bounds);
                    }
                }
            }
        }
    }

    // Sort frames by position
    frames.sort((a, b) => {
        if (Math.abs(a.y - b.y) < 5) {
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

    const queue: [number, number][] = [[startX, startY]];
    visited[startY][startX] = true;

    while (queue.length > 0) {
        const [x, y] = queue.shift()!;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);

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

    const frameSizes = frames.map(f => ({ width: f.width, height: f.height }));
    const suggestedFrameSize = getMostCommonSize(frameSizes);

    const firstRowFrames = frames.filter(f => Math.abs(f.y - frames[0].y) < 5);
    const firstColFrames = frames.filter(f => Math.abs(f.x - frames[0].x) < 5);

    let layout: 'horizontal' | 'vertical' | 'grid';
    let rows: number;
    let columns: number;

    if (firstRowFrames.length === frames.length) {
        layout = 'horizontal';
        rows = 1;
        columns = frames.length;
    } else if (firstColFrames.length === frames.length) {
        layout = 'vertical';
        rows = frames.length;
        columns = 1;
    } else {
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
