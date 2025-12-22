import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Play, Pause, ZoomIn, ZoomOut, Upload, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useUploadCharacterSpriteSheet, useCreateSpriteSheet, useUpdateSpriteSheet, useGetSpriteSheet, useGetCharacterSpriteSheet } from '../hooks/useQueries';
import { BackgroundRemover } from '../components/BackgroundRemover';
import { SpriteSelector } from '../components/SpriteSelector';
import { TagInput } from '../components/TagInput';
import { analyzeSpriteSheet, type DetectionMode } from '../utils/spriteSheetAnalyzer';

// Animation type matching backend schema
type Direction = 'up' | 'down' | 'left' | 'right';
type Animation = {
    name: string;
    action_type: string;
    direction: Direction | null;
    frame_start: number;
    frame_count: number;
    frame_rate: number | null;
};

const ACTION_TYPES = ['walk', 'run', 'attack', 'idle', 'jump', 'die', 'cast', 'hurt', 'block'] as const;
const DIRECTIONS: (Direction | null)[] = [null, 'up', 'down', 'left', 'right'];

export default function SpritesView({ spriteId, onBack }: { spriteId?: string; onBack?: () => void }) {
    console.log('🔍 SpritesView RENDER - spriteId:', spriteId);

    const uploadSpriteSheet = useUploadCharacterSpriteSheet();
    const createSpriteSheet = useCreateSpriteSheet();
    const updateSpriteSheet = useUpdateSpriteSheet();

    // FIXED: Always call hooks unconditionally (React rules of hooks)
    const spriteQuery = useGetSpriteSheet(spriteId || '');
    const rawExistingSprite = spriteId ? spriteQuery.data : null;
    const isLoadingSprite = spriteId ? spriteQuery.isLoading : false;

    // CRITICAL: Ensure existingSprite always has tags as an array (defensive against race conditions)
    const existingSprite = rawExistingSprite ? {
        ...rawExistingSprite,
        tags: Array.isArray(rawExistingSprite.tags) ? rawExistingSprite.tags : [],
        animations: Array.isArray(rawExistingSprite.animations) ? rawExistingSprite.animations : []
    } : null;

    // FIXED: Always call hooks unconditionally (React rules of hooks)
    const blobQuery = useGetCharacterSpriteSheet(existingSprite?.blob_id || '');
    const spriteImageBlob = existingSprite ? blobQuery.data : null;

    console.log('🔍 Data loaded:', {
        existingSprite: existingSprite ? 'YES' : 'NO',
        spriteImageBlob: spriteImageBlob ? 'YES' : 'NO',
        isLoadingSprite,
        existingSpriteTags: existingSprite?.tags,
        existingSpriteTagsType: typeof existingSprite?.tags,
        existingSpriteTagsIsArray: Array.isArray(existingSprite?.tags)
    });

    const [spriteState, setSpriteState] = useState<{
        name: string;
        description: string;
        tags: string[];
        file: File | null;
        frameCount: number;
        frameWidth: number;
        frameHeight: number;
    }>({
        name: '',
        description: '',
        tags: [],
        file: null,
        frameCount: 1,
        frameWidth: 32,
        frameHeight: 32,
    });

    // Ensure tags is always an array (defensive programming)
    const safeSpriteStateTags = Array.isArray(spriteState.tags) ? spriteState.tags : [];

    console.log('🔍 spriteState.tags:', spriteState.tags, 'type:', typeof spriteState.tags, 'isArray:', Array.isArray(spriteState.tags));
    console.log('🔍 safeSpriteStateTags:', safeSpriteStateTags, 'type:', typeof safeSpriteStateTags, 'isArray:', Array.isArray(safeSpriteStateTags));

    // Debug: Track spriteState changes
    useEffect(() => {
        console.log('🔍 spriteState CHANGED:', {
            tags: spriteState.tags,
            tagsType: typeof spriteState.tags,
            tagsIsArray: Array.isArray(spriteState.tags),
            name: spriteState.name,
            description: spriteState.description
        });
    }, [spriteState]);

    const [detectionMode, setDetectionMode] = useState<DetectionMode>('alpha');
    const [manualOffset, setManualOffset] = useState({ x: 0, y: 0 });
    const [removeBackground, setRemoveBackground] = useState(false);
    const [showBackgroundRemover, setShowBackgroundRemover] = useState(false);
    const [processedImageBlob, setProcessedImageBlob] = useState<Blob | null>(null);
    const [showSpriteSelector, setShowSpriteSelector] = useState(false);
    const [existingSpriteFile, setExistingSpriteFile] = useState<File | null>(null); // File version of existing sprite for BackgroundRemover

    // Preview state
    const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [detectedFrames, setDetectedFrames] = useState<any[]>([]);
    const [isAnimating, setIsAnimating] = useState(true);
    const [currentFrame, setCurrentFrame] = useState(0);

    // Manual selection drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
    const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);

    // Animation editor state
    const [animations, setAnimations] = useState<Animation[]>([]);
    const [showAnimationForm, setShowAnimationForm] = useState(false);
    const [editingAnimationIndex, setEditingAnimationIndex] = useState<number | null>(null);
    const [newAnimation, setNewAnimation] = useState<Animation>({
        name: '',
        action_type: 'idle',
        direction: null,
        frame_start: 0,
        frame_count: 1,
        frame_rate: null
    });

    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const animationCanvasRef = useRef<HTMLCanvasElement>(null);
    const initialDataLoaded = useRef(false); // Track if we've already loaded existing sprite data

    // Load existing sprite sheet when editing (only once)
    useEffect(() => {
        console.log('🔍 useEffect TRIGGERED - existingSprite:', existingSprite ? 'YES' : 'NO', 'spriteImageBlob:', spriteImageBlob ? 'YES' : 'NO', 'initialDataLoaded:', initialDataLoaded.current);

        if (!existingSprite || !spriteImageBlob) {
            console.log('🔍 useEffect EARLY RETURN - no sprite or blob');
            return;
        }

        // Skip if we've already loaded the initial data (prevents resetting user input)
        if (initialDataLoaded.current) {
            console.log('🔍 useEffect SKIPPED - initial data already loaded');
            return;
        }

        // Mark that we've loaded initial data
        initialDataLoaded.current = true;

        // DEBUG: Log the sprite data to see what we're getting
        console.log('🔍 Loading existing sprite:', existingSprite);
        console.log('🔍 Sprite tags RAW:', existingSprite.tags, 'type:', typeof existingSprite.tags, 'isArray:', Array.isArray(existingSprite.tags));
        console.log('🔍 Sprite animations:', existingSprite.animations);

        // Ensure animations is always an array (backend might return undefined)
        const safeAnimations = existingSprite.animations || [];

        // Ensure tags is ALWAYS an array with multiple safety checks
        let safeTags: string[] = [];
        if (Array.isArray(existingSprite.tags)) {
            safeTags = existingSprite.tags;
            console.log('🔍 Tags is array, using directly:', safeTags);
        } else if (existingSprite.tags) {
            console.warn('⚠️ Tags is not an array but exists:', existingSprite.tags, 'type:', typeof existingSprite.tags);
            safeTags = [];
        } else {
            console.log('🔍 Tags is null/undefined, using empty array');
            safeTags = [];
        }

        const newState = {
            name: existingSprite.name || '',
            description: existingSprite.description || '',
            tags: safeTags,
            file: null, // We don't have the original file, just the blob
            frameCount: Number(existingSprite.total_frames) || 1,
            frameWidth: Number(existingSprite.frame_width) || 32,
            frameHeight: Number(existingSprite.frame_height) || 32,
        };

        console.log('🔍 Setting sprite state with tags:', newState.tags, 'isArray:', Array.isArray(newState.tags));

        // Populate sprite state with existing data (with comprehensive null safety)
        setSpriteState(newState);

        // Load existing animations
        setAnimations(safeAnimations as Animation[]);

        // Load the image from blob
        const uint8Array = spriteImageBlob instanceof Uint8Array ? spriteImageBlob : new Uint8Array(spriteImageBlob);
        const blob = new Blob([uint8Array.buffer as ArrayBuffer], { type: 'image/png' });

        // Create a File from the blob for BackgroundRemover
        const file = new File([blob], existingSprite.name || 'sprite.png', { type: 'image/png' });
        setExistingSpriteFile(file);

        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = async () => {
            setPreviewImage(img);

            // Analyze the loaded sprite sheet
            const analysis = await analyzeSpriteSheet(img, {
                expectedFrameWidth: Number(existingSprite.frame_width),
                expectedFrameHeight: Number(existingSprite.frame_height),
                expectedFrameCount: Number(existingSprite.total_frames),
                detectionMode: detectionMode,
                manualOffsetX: manualOffset.x,
                manualOffsetY: manualOffset.y,
            });

            setDetectedFrames(analysis.frames);
        };
        img.src = url;

        return () => URL.revokeObjectURL(url);
    }, [existingSprite, spriteImageBlob]);

    // Create a safe version of existingSprite with animations guaranteed to be an array
    const safeExistingSprite = existingSprite ? {
        ...existingSprite,
        animations: existingSprite.animations || []
    } : null;

    // Ensure detectedFrames is always an array (declare early for use in useEffects)
    const safeDetectedFrames = detectedFrames || [];

    // Load and analyze sprite sheet when file changes (only for NEW file uploads, not existing sprites)
    useEffect(() => {
        console.log('🔵 FILE UPLOAD useEffect triggered:', {
            hasFile: !!spriteState.file,
            spriteId: spriteId,
            frameWidth: spriteState.frameWidth,
            frameHeight: spriteState.frameHeight,
            frameCount: spriteState.frameCount
        });

        // Only clear preview if this is a new sprite (no spriteId) and no file is selected
        // Don't clear when editing existing sprites
        // Also, allow processedImageBlob to update the preview even for existing sprites
        const hasFileToProcess = spriteState.file || processedImageBlob;
        if (!hasFileToProcess) {
            if (!spriteId) {
                console.log('🔵 CLEARING PREVIEW - new sprite with no file');
                setPreviewImage(null);
                setDetectedFrames([]);
            } else {
                console.log('🔵 SKIPPING CLEAR - editing existing sprite (spriteId:', spriteId, ')');
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = new Image();
            img.onload = async () => {
                setPreviewImage(img);

                // Analyze sprite sheet with manual offset
                const analysis = await analyzeSpriteSheet(img, {
                    expectedFrameWidth: spriteState.frameWidth,
                    expectedFrameHeight: spriteState.frameHeight,
                    expectedFrameCount: spriteState.frameCount,
                    detectionMode: detectionMode,
                    manualOffsetX: manualOffset.x,
                    manualOffsetY: manualOffset.y,
                });

                setDetectedFrames(analysis.frames);
            };
            img.src = e.target?.result as string;
        };

        // Use processed image if background was removed, otherwise use original file
        const fileToRead = processedImageBlob || spriteState.file;
        if (fileToRead) {
            reader.readAsDataURL(fileToRead);
        }
    }, [spriteState.file, detectionMode, spriteState.frameWidth, spriteState.frameHeight, spriteState.frameCount, manualOffset, processedImageBlob]);

    // Re-analyze EXISTING sprites when frame dimensions change (for edit mode)
    useEffect(() => {
        // Only run for existing sprites (when we have spriteId and previewImage but no file)
        if (!spriteId || !previewImage || spriteState.file) return;

        const reanalyze = async () => {
            console.log('🔍 Re-analyzing existing sprite with new dimensions:', {
                frameWidth: spriteState.frameWidth,
                frameHeight: spriteState.frameHeight,
                frameCount: spriteState.frameCount
            });

            const analysis = await analyzeSpriteSheet(previewImage, {
                expectedFrameWidth: spriteState.frameWidth,
                expectedFrameHeight: spriteState.frameHeight,
                expectedFrameCount: spriteState.frameCount,
                detectionMode: detectionMode,
                manualOffsetX: manualOffset.x,
                manualOffsetY: manualOffset.y,
            });

            setDetectedFrames(analysis.frames);
        };

        reanalyze();
    }, [spriteId, previewImage, spriteState.frameWidth, spriteState.frameHeight, spriteState.frameCount, detectionMode, manualOffset, spriteState.file]);

    // Draw preview with frame overlays
    useEffect(() => {
        if (!previewImage || !previewCanvasRef.current) return;

        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = previewImage.width;
        canvas.height = previewImage.height;

        // Draw image
        ctx.drawImage(previewImage, 0, 0);

        // Draw boxes over detected frames (only if not currently drawing in manual mode)
        if (detectionMode !== 'manual' || !isDrawing) {
            safeDetectedFrames.forEach((frame, i) => {
                // Use subtle red for current frame if multiple frames exist
                const isCurrentFrame = i === currentFrame && safeDetectedFrames.length > 1;
                const color = isCurrentFrame ? '#ff6b6b' : '#00ff00';

                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

                // Draw frame number centered above the frame
                ctx.fillStyle = color;
                ctx.font = isCurrentFrame ? 'bold 14px monospace' : '12px monospace';
                const text = `${i + 1}`;
                const textWidth = ctx.measureText(text).width;
                const centerX = frame.x + (frame.width / 2) - (textWidth / 2);
                ctx.fillText(text, centerX, frame.y - 6);
            });
        }

        // Draw selection box in manual mode
        if (detectionMode === 'manual' && drawStart && drawEnd) {
            const x = Math.min(drawStart.x, drawEnd.x);
            const y = Math.min(drawStart.y, drawEnd.y);
            const width = Math.abs(drawEnd.x - drawStart.x);
            const height = Math.abs(drawEnd.y - drawStart.y);

            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            // Draw dimensions
            ctx.fillStyle = '#00ff00';
            ctx.font = '14px monospace';
            ctx.fillText(`${Math.round(width)} × ${Math.round(height)}`, x, y - 5);
        }
    }, [previewImage, detectedFrames, detectionMode, isDrawing, drawStart, drawEnd, currentFrame, isAnimating]);

    // Animate sprite preview
    useEffect(() => {
        if (!isAnimating || safeDetectedFrames.length === 0 || !previewImage) return;

        const interval = setInterval(() => {
            setCurrentFrame((prev) => (prev + 1) % safeDetectedFrames.length);
        }, 150);

        return () => clearInterval(interval);
    }, [isAnimating, detectedFrames, previewImage]); // FIXED: Use detectedFrames instead of safeDetectedFrames.length

    // Draw animated preview
    useEffect(() => {
        if (!previewImage || !animationCanvasRef.current || safeDetectedFrames.length === 0) return;

        const canvas = animationCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const frame = safeDetectedFrames[currentFrame];
        if (!frame) return;

        canvas.width = frame.width;
        canvas.height = frame.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
            previewImage,
            frame.x, frame.y, frame.width, frame.height,
            0, 0, frame.width, frame.height
        );
    }, [previewImage, safeDetectedFrames, currentFrame]);

    const handleSpriteUpload = async (e: React.FormEvent) => {
        e.preventDefault();

        // For new sprites, we need a file. For existing sprites, we have existingSpriteFile or can skip upload
        const hasFile = spriteState.file || existingSpriteFile || processedImageBlob;
        if (!hasFile && !spriteId) {
            toast.error('Please provide a name and select a file');
            return;
        }
        if (!spriteState.name) {
            toast.error('Please provide a name');
            return;
        }

        // Generate auto-generated immutable sprite ID (only for new sprites)
        const newSpriteId = spriteId || `sprite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const blobId = `${newSpriteId}_blob`;

        try {
            // Step 1: Upload sprite sheet image blob (only if we have a new file or processed image)
            const fileToUpload = processedImageBlob || spriteState.file || existingSpriteFile;
            if (fileToUpload) {
                const buffer = await fileToUpload.arrayBuffer();
                const uint8Array = new Uint8Array(buffer);

                await uploadSpriteSheet.mutateAsync({
                    blob_id: blobId,
                    data: uint8Array
                });
            }

            // Step 2: Create or update sprite sheet metadata record
            // Convert animations to Candid-compatible format
            const candid_animations = animations.map(anim => {
                // Convert direction string to Candid variant format: [] | [{ 'up': null } | ...]
                let candid_direction: [] | [{ 'up': null } | { 'down': null } | { 'left': null } | { 'right': null }] = [];
                if (anim.direction === 'up') candid_direction = [{ 'up': null }];
                else if (anim.direction === 'down') candid_direction = [{ 'down': null }];
                else if (anim.direction === 'left') candid_direction = [{ 'left': null }];
                else if (anim.direction === 'right') candid_direction = [{ 'right': null }];

                // Convert frame_rate to optional bigint format: [] | [bigint]
                const candid_frame_rate: [] | [bigint] = anim.frame_rate !== null ? [BigInt(anim.frame_rate)] : [];

                return {
                    name: anim.name,
                    action_type: anim.action_type,
                    direction: candid_direction,
                    frame_start: BigInt(anim.frame_start),
                    frame_count: BigInt(anim.frame_count),
                    frame_rate: candid_frame_rate
                };
            });

            const spriteSheetRecord = {
                id: newSpriteId,
                name: spriteState.name,
                description: spriteState.description,
                tags: spriteState.tags,
                blob_id: blobId,
                frame_width: BigInt(spriteState.frameWidth),
                frame_height: BigInt(spriteState.frameHeight),
                total_frames: BigInt(spriteState.frameCount),
                animations: candid_animations, // Use converted animations for Candid compatibility
                created_at: existingSprite?.created_at || BigInt(Date.now() * 1000000), // Preserve original timestamp when editing
                updated_at: BigInt(Date.now() * 1000000)
            };

            let result;
            if (spriteId) {
                // Updating existing sprite
                result = await updateSpriteSheet.mutateAsync({ id: spriteId, sheet: spriteSheetRecord });
            } else {
                // Creating new sprite
                result = await createSpriteSheet.mutateAsync(spriteSheetRecord);
            }

            if ('err' in result) {
                throw new Error(result.err.message);
            }

            toast.success(`Sprite "${spriteState.name}" ${spriteId ? 'updated' : 'saved'} successfully!`);

            // Reset form including metadata
            setSpriteState({
                name: '',
                description: '',
                tags: [],
                file: null,
                frameCount: 1,
                frameWidth: 32,
                frameHeight: 32,
            });
            setProcessedImageBlob(null);
            setRemoveBackground(false);
            setPreviewImage(null);
            setDetectedFrames([]);
        } catch (error: any) {
            console.error('Save error:', error);
            if (error.message?.includes('409') || error.message?.includes('already exists')) {
                toast.error('Sprite ID already exists. Please try again.');
            } else if (error.message?.includes('blob')) {
                toast.error('Failed to upload sprite image.');
            } else {
                toast.error('Failed to save sprite: ' + (error.message || 'Unknown error'));
            }
        }
    };

    // Mouse handlers for manual selection
    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (detectionMode !== 'manual' || !previewCanvasRef.current) return;

        const canvas = previewCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;

        setIsDrawing(true);
        setDrawStart({ x, y });
        setDrawEnd({ x, y });
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !previewCanvasRef.current) return;

        const canvas = previewCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;

        setDrawEnd({ x, y });
    };

    const handleCanvasMouseUp = () => {
        if (!isDrawing || !drawStart || !drawEnd) return;

        const x = Math.min(drawStart.x, drawEnd.x);
        const y = Math.min(drawStart.y, drawEnd.y);
        const width = Math.abs(drawEnd.x - drawStart.x);
        const height = Math.abs(drawEnd.y - drawStart.y);

        setManualOffset({ x: Math.round(x), y: Math.round(y) });
        setSpriteState(prev => ({
            ...prev,
            frameWidth: Math.round(width),
            frameHeight: Math.round(height),
        }));

        setIsDrawing(false);
        setDrawStart(null);
        setDrawEnd(null);
    };

    const handleCanvasMouseLeave = () => {
        if (isDrawing) {
            setIsDrawing(false);
            setDrawStart(null);
            setDrawEnd(null);
        }
    };


    // Show loading state while fetching sprite data OR sprite image
    if (isLoadingSprite || (spriteId && !spriteImageBlob)) {
        return (
            <div className="p-6 max-w-[1800px] mx-auto">
                <div className="text-center py-12">
                    <p className="text-lg">Loading sprite sheet...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1800px] mx-auto">
            <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                    {onBack && (
                        <Button variant="outline" size="sm" onClick={onBack}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Library
                        </Button>
                    )}
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold">Sprite Editor</h1>
                        <p className="text-muted-foreground mt-1">
                            {spriteId ? 'Edit animations for your sprite sheet' : 'Upload and configure sprite sheets for use in your game'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Upload Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSpriteUpload} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Sprite Name *</Label>
                                <Input
                                    placeholder="e.g., knight, wizard"
                                    value={spriteState.name}
                                    onChange={(e) => setSpriteState({ ...spriteState, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Description</Label>
                                <textarea
                                    className="w-full p-2 text-xs border rounded-md bg-background min-h-[60px] resize-none"
                                    placeholder="Optional description of the sprite..."
                                    value={spriteState.description}
                                    onChange={(e) => setSpriteState({ ...spriteState, description: e.target.value })}
                                />
                            </div>

                            {(() => {
                                console.log('🔍 About to render TagInput with tags:', safeSpriteStateTags);
                                return (
                                    <TagInput
                                        tags={safeSpriteStateTags}
                                        onTagsChange={(tags) => setSpriteState({ ...spriteState, tags: tags || [] })}
                                        suggestions={['typing', 'run', 'walk', 'shoot', 'jump', 'duck', 'roll', 'left', 'right', 'up', 'down', 'crawl']}
                                        label="Tags"
                                        placeholder="Type to add tags..."
                                    />
                                );
                            })()}

                            <div className="space-y-2">
                                <Label className="text-xs">Detection Mode</Label>
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        variant={detectionMode === 'alpha' ? 'default' : 'outline'}
                                        size="sm"
                                        className="text-xs flex-1"
                                        onClick={() => setDetectionMode('alpha')}
                                    >
                                        Alpha
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={detectionMode === 'blackBorder' ? 'default' : 'outline'}
                                        size="sm"
                                        className="text-xs flex-1"
                                        onClick={() => setDetectionMode('blackBorder')}
                                    >
                                        Border
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={detectionMode === 'manual' ? 'default' : 'outline'}
                                        size="sm"
                                        className="text-xs flex-1"
                                        onClick={() => setDetectionMode('manual')}
                                    >
                                        Manual
                                    </Button>
                                </div>
                            </div>

                            {detectionMode === 'manual' && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-xs">X Offset</Label>
                                            <Input
                                                type="number"
                                                className="text-xs h-8"
                                                value={manualOffset.x}
                                                onChange={(e) => setManualOffset({ ...manualOffset, x: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Y Offset</Label>
                                            <Input
                                                type="number"
                                                className="text-xs h-8"
                                                value={manualOffset.y}
                                                onChange={(e) => setManualOffset({ ...manualOffset, y: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">Frames</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        className="text-xs h-8"
                                        value={spriteState.frameCount}
                                        onChange={(e) => setSpriteState({ ...spriteState, frameCount: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Width</Label>
                                    <Input
                                        type="number"
                                        className="text-xs h-8"
                                        value={spriteState.frameWidth}
                                        onChange={(e) => setSpriteState({ ...spriteState, frameWidth: parseInt(e.target.value) || 32 })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Height</Label>
                                    <Input
                                        type="number"
                                        className="text-xs h-8"
                                        value={spriteState.frameHeight}
                                        onChange={(e) => setSpriteState({ ...spriteState, frameHeight: parseInt(e.target.value) || 32 })}
                                    />
                                </div>
                            </div>

                            {/* Only show file upload when creating new sprite, not when editing */}
                            {!spriteId && (
                                <div className="space-y-2">
                                    <Label className="text-xs">Sprite Sheet (PNG)</Label>
                                    <Input
                                        type="file"
                                        accept="image/png"
                                        className="text-xs"
                                        onChange={(e) => setSpriteState({ ...spriteState, file: e.target.files?.[0] || null })}
                                    />
                                </div>
                            )}

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="removeBackground"
                                    checked={removeBackground}
                                    onChange={(e) => {
                                        setRemoveBackground(e.target.checked);
                                        const fileToUse = spriteState.file || existingSpriteFile;
                                        if (e.target.checked && fileToUse) {
                                            setShowBackgroundRemover(true);
                                        } else {
                                            setShowBackgroundRemover(false);
                                            setProcessedImageBlob(null);
                                        }
                                    }}
                                    className="h-4 w-4"
                                />
                                <Label htmlFor="removeBackground" className="text-xs cursor-pointer">
                                    Remove background
                                </Label>
                            </div>

                            {showBackgroundRemover && (spriteState.file || existingSpriteFile) && (
                                <BackgroundRemover
                                    imageFile={(spriteState.file || existingSpriteFile)!}
                                    onProcessed={(blob) => {
                                        setProcessedImageBlob(blob);
                                        setShowBackgroundRemover(false);
                                    }}
                                    onCancel={() => {
                                        setShowBackgroundRemover(false);
                                        setRemoveBackground(false);
                                        setProcessedImageBlob(null);
                                    }}
                                />
                            )}

                            {/* Animation Editor Section */}
                            <div className="space-y-2 border-t pt-3 mt-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold">Animations ({animations.length})</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        disabled={!spriteState.frameCount || spriteState.frameCount < 1}
                                        onClick={() => {
                                            // Capture current preview frame settings
                                            setNewAnimation({
                                                name: '',
                                                action_type: 'idle',
                                                direction: null,
                                                frame_start: 0,
                                                frame_count: spriteState.frameCount || 1,
                                                frame_rate: null
                                            });
                                            setEditingAnimationIndex(null);
                                            setShowAnimationForm(!showAnimationForm);
                                        }}
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add ({spriteState.frameCount} frames)
                                    </Button>
                                </div>

                                {/* Animation List */}
                                {animations.length > 0 && (
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {animations.map((anim, index) => (
                                            <div key={index} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1 text-xs">
                                                <div className="flex-1 truncate">
                                                    <span className="font-medium">{anim.name}</span>
                                                    <span className="text-muted-foreground ml-1">
                                                        ({anim.action_type}{anim.direction ? `_${anim.direction}` : ''})
                                                    </span>
                                                    <span className="text-muted-foreground ml-1">
                                                        F{anim.frame_start}-{anim.frame_start + anim.frame_count - 1}
                                                    </span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 w-5 p-0"
                                                        onClick={() => {
                                                            setNewAnimation({ ...anim });
                                                            setEditingAnimationIndex(index);
                                                            setShowAnimationForm(true);
                                                        }}
                                                    >
                                                        ✏️
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 w-5 p-0 text-destructive"
                                                        onClick={() => {
                                                            setAnimations(prev => prev.filter((_, i) => i !== index));
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add/Edit Animation Form */}
                                {showAnimationForm && (
                                    <div className="space-y-2 p-2 bg-muted/30 rounded border">
                                        <div className="text-xs font-medium">
                                            {editingAnimationIndex !== null ? 'Edit Animation' : 'New Animation'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Using {spriteState.frameCount} frames from sprite preview (Frame 0-{spriteState.frameCount - 1})
                                        </div>

                                        <div className="grid gap-2">
                                            <Input
                                                placeholder="Animation name (e.g., walk_down)"
                                                value={newAnimation.name}
                                                onChange={(e) => setNewAnimation(prev => ({ ...prev, name: e.target.value }))}
                                                className="text-xs h-7"
                                            />

                                            <div className="grid grid-cols-2 gap-2">
                                                <select
                                                    value={newAnimation.action_type}
                                                    onChange={(e) => setNewAnimation(prev => ({ ...prev, action_type: e.target.value }))}
                                                    className="text-xs h-7 rounded border bg-background px-2"
                                                >
                                                    {ACTION_TYPES.map(type => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                </select>

                                                <select
                                                    value={newAnimation.direction || ''}
                                                    onChange={(e) => setNewAnimation(prev => ({
                                                        ...prev,
                                                        direction: e.target.value ? e.target.value as Direction : null
                                                    }))}
                                                    className="text-xs h-7 rounded border bg-background px-2"
                                                >
                                                    <option value="">No direction</option>
                                                    {DIRECTIONS.filter(d => d !== null).map(dir => (
                                                        <option key={dir} value={dir!}>{dir}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <Label className="text-xs">Start Frame</Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={spriteState.frameCount - 1}
                                                        value={newAnimation.frame_start}
                                                        onChange={(e) => setNewAnimation(prev => ({
                                                            ...prev,
                                                            frame_start: Math.max(0, parseInt(e.target.value) || 0)
                                                        }))}
                                                        className="text-xs h-7"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Frame Count</Label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={spriteState.frameCount}
                                                        value={newAnimation.frame_count}
                                                        onChange={(e) => setNewAnimation(prev => ({
                                                            ...prev,
                                                            frame_count: Math.max(1, parseInt(e.target.value) || 1)
                                                        }))}
                                                        className="text-xs h-7"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="flex-1 h-7 text-xs"
                                                disabled={!newAnimation.name}
                                                onClick={() => {
                                                    if (editingAnimationIndex !== null) {
                                                        // Update existing animation
                                                        setAnimations(prev => prev.map((a, i) =>
                                                            i === editingAnimationIndex ? newAnimation : a
                                                        ));
                                                    } else {
                                                        // Add new animation
                                                        setAnimations(prev => [...prev, newAnimation]);
                                                    }
                                                    setShowAnimationForm(false);
                                                    setEditingAnimationIndex(null);
                                                    setNewAnimation({
                                                        name: '',
                                                        action_type: 'idle',
                                                        direction: null,
                                                        frame_start: 0,
                                                        frame_count: 1,
                                                        frame_rate: null
                                                    });
                                                }}
                                            >
                                                {editingAnimationIndex !== null ? 'Update' : 'Add Animation'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => {
                                                    setShowAnimationForm(false);
                                                    setEditingAnimationIndex(null);
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full text-xs"
                                size="sm"
                                disabled={(!spriteState.file && !spriteId) || !spriteState.name || (removeBackground && !processedImageBlob && !showBackgroundRemover)}
                            >
                                <Upload className="mr-2 h-3 w-3" />
                                Save Sprite
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Center: Large Preview */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Sprite Sheet Preview</CardTitle>
                            {previewImage && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setZoom(Math.max(0.5, zoom - 0.5))}
                                    >
                                        <ZoomOut className="h-4 w-4" />
                                    </Button>
                                    <span className="text-xs flex items-center px-2">{Math.round(zoom * 100)}%</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setZoom(Math.min(4, zoom + 0.5))}
                                    >
                                        <ZoomIn className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!previewImage ? (
                            <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground text-sm">Upload a sprite sheet to see preview</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="overflow-auto border rounded-lg bg-checkerboard p-4" style={{ maxHeight: '500px' }}>
                                    <canvas
                                        ref={previewCanvasRef}
                                        style={{
                                            imageRendering: 'pixelated',
                                            transform: `scale(${zoom})`,
                                            transformOrigin: 'top left',
                                            cursor: detectionMode === 'manual' ? 'crosshair' : 'default',
                                        }}
                                        onMouseDown={handleCanvasMouseDown}
                                        onMouseMove={handleCanvasMouseMove}
                                        onMouseUp={handleCanvasMouseUp}
                                        onMouseLeave={handleCanvasMouseLeave}
                                    />
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Green boxes show detected frames ({safeDetectedFrames.length} found)</span>
                                    <span>{previewImage.width} × {previewImage.height}px</span>
                                </div>

                                {/* Animated Preview */}
                                {safeDetectedFrames.length > 0 && (
                                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                                        <div className="flex flex-col gap-2">
                                            <div className="text-xs font-semibold">Animation Preview</div>
                                            <div className="border rounded bg-checkerboard p-2">
                                                <canvas
                                                    ref={animationCanvasRef}
                                                    style={{
                                                        imageRendering: 'pixelated',
                                                        width: '128px',
                                                        height: '128px',
                                                    }}
                                                />
                                            </div>
                                            <div className="text-xs text-center text-muted-foreground">
                                                Frame {currentFrame + 1}/{safeDetectedFrames.length}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsAnimating(!isAnimating)}
                                            >
                                                {isAnimating ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                                {isAnimating ? 'Pause' : 'Play'}
                                            </Button>
                                            <div className="text-xs text-muted-foreground">
                                                {spriteState.frameWidth} × {spriteState.frameHeight}px per frame
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <style>{`
                .bg-checkerboard {
                    background-image: 
                        linear-gradient(45deg, #ccc 25%, transparent 25%),
                        linear-gradient(-45deg, #ccc 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #ccc 75%),
                        linear-gradient(-45deg, transparent 75%, #ccc 75%);
                    background-size: 20px 20px;
                    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                }
            `}</style>
        </div>
    );
}
