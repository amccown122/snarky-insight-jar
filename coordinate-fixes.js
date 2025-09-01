/**
 * Coordinate System Fixes for Snarky Insight Jar
 * 
 * This file contains corrected implementations of the coordinate transformation
 * functions to fix the issues identified in the performance analysis.
 */

// Enhanced canvas fitting with proper DPR handling
function fitCanvasImproved(canvas, ctx) {
    const rect = canvas.getBoundingClientRect();
    
    // Clamp device pixel ratio to prevent memory issues
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    
    // Use Math.ceil to prevent dimension truncation
    const w = Math.max(1, Math.ceil(rect.width * dpr));
    const h = Math.max(1, Math.ceil(rect.height * dpr));
    
    // Only update canvas dimensions if they changed
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        
        // Set the transform matrix for proper scaling
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    
    return { 
        width: w, 
        height: h, 
        dpr, 
        clientWidth: rect.width, 
        clientHeight: rect.height 
    };
}

// Unified coordinate transformation with boundary validation
function transformCoordinatesImproved(nx, ny, coinSize, canvasInfo) {
    // Use client dimensions for consistency
    const canvasW = canvasInfo.clientWidth;
    const canvasH = canvasInfo.clientHeight;
    
    // Calculate maximum valid positions
    const maxX = canvasW - coinSize;
    const maxY = canvasH - coinSize;
    
    // Transform normalized coordinates to pixel coordinates
    const x = nx * maxX;
    const y = ny * maxY;
    
    // Validate bounds and clamp if necessary
    const clampedX = Math.max(0, Math.min(maxX, x));
    const clampedY = Math.max(0, Math.min(maxY, y));
    
    // Return both raw and clamped coordinates
    return {
        x: clampedX,
        y: clampedY,
        renderX: Math.round(clampedX),
        renderY: Math.round(clampedY),
        isValid: x >= 0 && y >= 0 && x <= maxX && y <= maxY,
        overflow: {
            x: x - clampedX,
            y: y - clampedY
        }
    };
}

// Improved mask coordinate transformation
function maskAlphaAtImproved(nx, ny, maskData, maskW, maskH) {
    if (!maskData) return 0;
    
    // Use precise coordinate transformation
    const exactX = nx * maskW;
    const exactY = ny * maskH;
    
    // Clamp to valid bounds before rounding
    const x = Math.max(0, Math.min(maskW - 1, Math.round(exactX)));
    const y = Math.max(0, Math.min(maskH - 1, Math.round(exactY)));
    
    return maskData[(y * maskW + x) * 4 + 3];
}

// Enhanced inside mask checking with better edge detection
function insideMaskPaddedImproved(nx, ny, padPx, maskData, maskW, maskH) {
    const steps = 4;
    let minA = 255;
    
    // Convert padding from pixels to normalized coordinates
    const padNormX = padPx / maskW;
    const padNormY = padPx / maskH;
    
    for (let dy = -steps; dy <= steps; dy++) {
        for (let dx = -steps; dx <= steps; dx++) {
            const sx = nx + dx * padNormX;
            const sy = ny + dy * padNormY;
            
            // Early exit for out-of-bounds coordinates
            if (sx < 0 || sx > 1 || sy < 0 || sy > 1) {
                return false;
            }
            
            const a = maskAlphaAtImproved(sx, sy, maskData, maskW, maskH);
            if (a < minA) {
                minA = a;
            }
        }
    }
    
    return minA > 220;
}

// Optimized mask application with caching
function createMaskManager() {
    let scaledMaskCanvas = null;
    let lastCanvasDimensions = null;
    
    return {
        applyMask(ctx, maskCanvas, canvas) {
            if (!maskCanvas) return;
            
            const currentDimensions = `${canvas.width}x${canvas.height}`;
            
            // Only re-scale mask when canvas dimensions change
            if (!scaledMaskCanvas || lastCanvasDimensions !== currentDimensions) {
                scaledMaskCanvas = document.createElement('canvas');
                scaledMaskCanvas.width = canvas.width;
                scaledMaskCanvas.height = canvas.height;
                
                const scaledCtx = scaledMaskCanvas.getContext('2d');
                // Use high-quality scaling
                scaledCtx.imageSmoothingEnabled = true;
                scaledCtx.imageSmoothingQuality = 'high';
                scaledCtx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
                
                lastCanvasDimensions = currentDimensions;
            }
            
            ctx.save();
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(scaledMaskCanvas, 0, 0);
            ctx.restore();
        },
        
        invalidateCache() {
            scaledMaskCanvas = null;
            lastCanvasDimensions = null;
        }
    };
}

// Enhanced sample inside function with better coordinate consistency
function sampleInsideImproved(seed, existing, coinSize, canvasInfo, maskData, maskW, maskH) {
    const rng = mulberry32(hashString(seed));
    const pad = 35;
    const minSep = 0.65 * coinSize;
    
    // Use consistent coordinate system for distance calculations
    const canvasW = canvasInfo.clientWidth;
    const canvasH = canvasInfo.clientHeight;
    
    for (let i = 0; i < 150; i++) {
        const nx = 0.08 + rng() * 0.84;
        const ny = 0.15 + Math.pow(rng(), 2) * 0.75;
        
        // Check mask bounds with improved function
        if (!insideMaskPaddedImproved(nx, ny, pad, maskData, maskW, maskH)) {
            continue;
        }
        
        // Use consistent coordinate system for distance checking
        let ok = true;
        for (const p of existing) {
            const dx = (nx - p.x) * canvasW;
            const dy = (ny - p.y) * canvasH;
            if (Math.hypot(dx, dy) < minSep) {
                ok = false;
                break;
            }
        }
        
        if (ok) {
            return { x: nx, y: ny };
        }
    }
    
    console.warn('Could not find valid position, using fallback');
    // Return a safe fallback position
    return { x: 0.5, y: 0.80 };
}

// Performance monitoring utilities
function createPerformanceMonitor() {
    let frameCount = 0;
    let lastTime = performance.now();
    let slowFrameCount = 0;
    
    return {
        startFrame() {
            return performance.now();
        },
        
        endFrame(startTime) {
            const endTime = performance.now();
            const frameTime = endTime - startTime;
            frameCount++;
            
            // Track slow frames (>16.67ms for 60fps)
            if (frameTime > 16.67) {
                slowFrameCount++;
            }
            
            // Log performance stats every 60 frames
            if (frameCount % 60 === 0) {
                const avgTime = (endTime - lastTime) / 60;
                const slowFramePercent = (slowFrameCount / 60) * 100;
                
                if (slowFramePercent > 10) {
                    console.warn(`Performance warning: ${slowFramePercent.toFixed(1)}% slow frames, avg: ${avgTime.toFixed(2)}ms`);
                }
                
                slowFrameCount = 0;
                lastTime = endTime;
            }
            
            return frameTime;
        }
    };
}

// Coordinate validation utility
function validateCoordinates(coords, coinSize, canvasInfo) {
    const { x, y } = coords;
    const maxX = canvasInfo.clientWidth - coinSize;
    const maxY = canvasInfo.clientHeight - coinSize;
    
    const issues = [];
    
    if (x < 0) issues.push(`X coordinate ${x} is negative`);
    if (y < 0) issues.push(`Y coordinate ${y} is negative`);
    if (x > maxX) issues.push(`X coordinate ${x} exceeds maximum ${maxX}`);
    if (y > maxY) issues.push(`Y coordinate ${y} exceeds maximum ${maxY}`);
    
    return {
        isValid: issues.length === 0,
        issues: issues,
        clampedCoords: {
            x: Math.max(0, Math.min(maxX, x)),
            y: Math.max(0, Math.min(maxY, y))
        }
    };
}

// Helper functions (assuming these exist in the original code)
function mulberry32(a) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashString(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fitCanvasImproved,
        transformCoordinatesImproved,
        maskAlphaAtImproved,
        insideMaskPaddedImproved,
        createMaskManager,
        sampleInsideImproved,
        createPerformanceMonitor,
        validateCoordinates
    };
} else if (typeof window !== 'undefined') {
    window.CoordinateFixes = {
        fitCanvasImproved,
        transformCoordinatesImproved,
        maskAlphaAtImproved,
        insideMaskPaddedImproved,
        createMaskManager,
        sampleInsideImproved,
        createPerformanceMonitor,
        validateCoordinates
    };
}