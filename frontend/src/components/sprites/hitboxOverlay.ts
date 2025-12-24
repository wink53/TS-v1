/**
 * Draw a hitbox overlay on a canvas context
 * Used in sprite editor to visualize collision hitbox
 */
export function drawHitboxOverlay(
    ctx: CanvasRenderingContext2D,
    hitbox: { offsetX: number; offsetY: number; width: number; height: number },
    color: string = 'rgba(255, 0, 0, 0.5)',
    lineWidth: number = 2
) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(
        hitbox.offsetX,
        hitbox.offsetY,
        hitbox.width,
        hitbox.height
    );
    ctx.restore();
}
