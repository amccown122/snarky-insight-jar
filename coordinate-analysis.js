/**
 * Coordinate System Analysis Tool for Snarky Insight Jar
 * 
 * This script analyzes the coordinate transformation accuracy and identifies
 * potential issues that could cause coins to appear outside jar boundaries.
 */

class CoordinateAnalyzer {
    constructor() {
        this.results = [];
        this.issues = [];
        this.recommendations = [];
    }

    /**
     * Analyze the fitCanvas function implementation
     */
    analyzeFitCanvas(canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const w = Math.max(1, Math.floor(rect.width * dpr));
        const h = Math.max(1, Math.floor(rect.height * dpr));
        
        this.results.push({
            test: 'fitCanvas Analysis',
            clientWidth: canvasElement.clientWidth,
            clientHeight: canvasElement.clientHeight,
            canvasWidth: canvasElement.width,
            canvasHeight: canvasElement.height,
            boundingWidth: rect.width,
            boundingHeight: rect.height,
            devicePixelRatio: window.devicePixelRatio,
            effectiveDPR: dpr,
            calculatedWidth: w,
            calculatedHeight: h
        });

        // Check for potential issues
        if (canvasElement.width !== w || canvasElement.height !== h) {
            this.issues.push({
                severity: 'HIGH',
                issue: 'Canvas buffer size mismatch',
                description: `Canvas internal dimensions (${canvasElement.width}x${canvasElement.height}) don't match calculated dimensions (${w}x${h})`,
                impact: 'Coordinate transformations will be inaccurate'
            });
        }

        // Check for non-integer scaling issues
        const scaleX = rect.width * dpr;
        const scaleY = rect.height * dpr;
        if (Math.abs(scaleX - Math.floor(scaleX)) > 0.01 || Math.abs(scaleY - Math.floor(scaleY)) > 0.01) {
            this.issues.push({
                severity: 'MEDIUM',
                issue: 'Non-integer canvas scaling',
                description: `Canvas scaling results in non-integer dimensions: ${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`,
                impact: 'May cause subpixel rendering issues and blurry appearance'
            });
        }
    }

    /**
     * Analyze coordinate transformation from normalized to pixel coordinates
     */
    analyzeCoordinateTransformation(canvasElement, coinSize = 69) {
        const w = canvasElement.clientWidth;
        const h = canvasElement.clientHeight;
        
        // Test various coordinate transformations
        const testCases = [
            { nx: 0, ny: 0, desc: 'Top-left corner' },
            { nx: 1, ny: 1, desc: 'Bottom-right corner' },
            { nx: 0.5, ny: 0.5, desc: 'Center' },
            { nx: 0.08, ny: 0.15, desc: 'App minimum bounds' },
            { nx: 0.92, ny: 0.9, desc: 'App maximum bounds' }
        ];

        testCases.forEach(testCase => {
            const { nx, ny, desc } = testCase;
            
            // Current implementation from the app
            const currentX = Math.round(nx * (w - coinSize));
            const currentY = Math.round(ny * (h - coinSize));
            
            // Alternative implementations to test
            const altX1 = nx * (w - coinSize); // No rounding
            const altY1 = ny * (h - coinSize);
            
            const altX2 = (nx * w) - (coinSize / 2); // Center-based
            const altY2 = (ny * h) - (coinSize / 2);
            
            // Check bounds
            const isOutOfBounds = currentX < 0 || currentY < 0 || 
                                currentX + coinSize > w || currentY + coinSize > h;
            
            this.results.push({
                test: 'Coordinate Transformation',
                case: desc,
                normalizedCoords: { x: nx, y: ny },
                currentPixelCoords: { x: currentX, y: currentY },
                alternativeCoords: [
                    { method: 'No rounding', x: altX1, y: altY1 },
                    { method: 'Center-based', x: altX2, y: altY2 }
                ],
                outOfBounds: isOutOfBounds,
                coinBounds: {
                    right: currentX + coinSize,
                    bottom: currentY + coinSize,
                    withinCanvas: currentX + coinSize <= w && currentY + coinSize <= h
                }
            });

            if (isOutOfBounds) {
                this.issues.push({
                    severity: 'HIGH',
                    issue: `Coordinate out of bounds: ${desc}`,
                    description: `Coordinates (${currentX}, ${currentY}) place coin outside canvas bounds`,
                    impact: 'Coin will be partially or completely outside visible area'
                });
            }
        });
    }

    /**
     * Analyze mask coordinate system alignment
     */
    analyzeMaskAlignment(maskW, maskH, canvasElement) {
        const canvasW = canvasElement.clientWidth;
        const canvasH = canvasElement.clientHeight;
        
        // Check aspect ratio alignment
        const maskAspect = maskW / maskH;
        const canvasAspect = canvasW / canvasH;
        const aspectDiff = Math.abs(maskAspect - canvasAspect);
        
        this.results.push({
            test: 'Mask Alignment',
            maskDimensions: { width: maskW, height: maskH },
            canvasDimensions: { width: canvasW, height: canvasH },
            maskAspectRatio: maskAspect,
            canvasAspectRatio: canvasAspect,
            aspectRatioDifference: aspectDiff
        });

        if (aspectDiff > 0.1) {
            this.issues.push({
                severity: 'MEDIUM',
                issue: 'Mask aspect ratio mismatch',
                description: `Mask aspect ratio (${maskAspect.toFixed(3)}) differs significantly from canvas (${canvasAspect.toFixed(3)})`,
                impact: 'Mask may not align properly with rendered content, causing visual artifacts'
            });
        }

        // Test mask coordinate transformation
        const testPoints = [
            { nx: 0.1, ny: 0.1 },
            { nx: 0.5, ny: 0.5 },
            { nx: 0.9, ny: 0.9 }
        ];

        testPoints.forEach(point => {
            const maskX = Math.round(point.nx * maskW);
            const maskY = Math.round(point.ny * maskH);
            const canvasX = point.nx * canvasW;
            const canvasY = point.ny * canvasH;
            
            // Check if mask scaling will align properly
            const scaledMaskX = (maskX / maskW) * canvasW;
            const scaledMaskY = (maskY / maskH) * canvasH;
            const alignment = Math.abs(scaledMaskX - canvasX) + Math.abs(scaledMaskY - canvasY);
            
            if (alignment > 1.0) {
                this.issues.push({
                    severity: 'LOW',
                    issue: `Mask coordinate misalignment at (${point.nx}, ${point.ny})`,
                    description: `Mask scaling causes ${alignment.toFixed(2)}px misalignment`,
                    impact: 'Minor visual artifacts in mask edge precision'
                });
            }
        });
    }

    /**
     * Analyze the insideMaskPadded function for edge detection accuracy
     */
    analyzeInsideMaskPadded(maskData, maskW, maskH, padPx = 35) {
        const steps = 4;
        
        function maskAlphaAt(nx, ny) {
            const x = Math.max(0, Math.min(maskW - 1, Math.round(nx * maskW)));
            const y = Math.max(0, Math.min(maskH - 1, Math.round(ny * maskH)));
            return maskData[(y * maskW + x) * 4 + 3];
        }
        
        function insideMaskPadded(nx, ny, padPx) {
            let minA = 255;
            for (let dy = -steps; dy <= steps; dy++) {
                for (let dx = -steps; dx <= steps; dx++) {
                    const sx = nx + dx * (padPx / maskW);
                    const sy = ny + dy * (padPx / maskH);
                    if (sx < 0 || sx > 1 || sy < 0 || sy > 1) return false;
                    const a = maskAlphaAt(sx, sy);
                    if (a < minA) minA = a;
                }
            }
            return minA > 220;
        }

        // Test edge detection accuracy
        const edgeTestPoints = [
            { nx: 0.08, ny: 0.15, expected: true, desc: 'App min bounds' },
            { nx: 0.92, ny: 0.9, expected: true, desc: 'App max bounds' },
            { nx: 0.05, ny: 0.1, expected: false, desc: 'Outside min bounds' },
            { nx: 0.95, ny: 0.95, expected: false, desc: 'Outside max bounds' }
        ];

        let edgeAccuracy = 0;
        edgeTestPoints.forEach(point => {
            const result = insideMaskPadded(point.nx, point.ny, padPx);
            const correct = result === point.expected;
            if (correct) edgeAccuracy++;
            
            this.results.push({
                test: 'Mask Edge Detection',
                point: point.desc,
                coordinates: { x: point.nx, y: point.ny },
                expected: point.expected,
                actual: result,
                correct: correct
            });

            if (!correct) {
                this.issues.push({
                    severity: 'MEDIUM',
                    issue: `Incorrect edge detection: ${point.desc}`,
                    description: `Expected ${point.expected} but got ${result} at (${point.nx}, ${point.ny})`,
                    impact: 'Coins may be placed in invalid positions'
                });
            }
        });

        const accuracyPercent = (edgeAccuracy / edgeTestPoints.length) * 100;
        this.results.push({
            test: 'Overall Edge Detection Accuracy',
            accuracy: `${accuracyPercent}%`,
            correctPredictions: edgeAccuracy,
            totalTests: edgeTestPoints.length
        });
    }

    /**
     * Generate performance recommendations
     */
    generateRecommendations() {
        // Canvas scaling recommendations
        this.recommendations.push({
            category: 'Canvas Scaling',
            recommendation: 'Use Math.ceil() instead of Math.floor() for canvas dimensions to prevent clipping',
            rationale: 'Math.floor() can cause the canvas to be slightly smaller than needed, leading to coordinate issues at edges',
            code: 'const w = Math.max(1, Math.ceil(rect.width * dpr));'
        });

        // Coordinate transformation recommendations
        this.recommendations.push({
            category: 'Coordinate Accuracy',
            recommendation: 'Consider using floating-point coordinates and rounding only at render time',
            rationale: 'Early rounding can accumulate errors and cause positioning issues',
            code: 'const x = nx * (w - coinSize); // Store as float\nconst renderX = Math.round(x); // Round only when drawing'
        });

        // Mask alignment recommendations
        this.recommendations.push({
            category: 'Mask Performance',
            recommendation: 'Pre-calculate mask bounds to avoid repeated coordinate transformations',
            rationale: 'Caching mask boundary calculations improves performance and consistency',
            code: 'const maskBounds = { minX: 0.08, minY: 0.15, maxX: 0.92, maxY: 0.9 };'
        });

        // Device pixel ratio recommendations
        this.recommendations.push({
            category: 'Device Compatibility',
            recommendation: 'Clamp device pixel ratio to reasonable bounds (1-3)',
            rationale: 'Very high DPR values can cause memory issues and rendering problems',
            code: 'const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));'
        });

        // Performance optimization recommendations
        this.recommendations.push({
            category: 'Performance',
            recommendation: 'Use requestAnimationFrame callback timing for frame rate monitoring',
            rationale: 'Helps detect performance issues and implement adaptive quality',
            code: 'let lastFrameTime = 0;\nfunction renderFrame(timestamp) {\n  const deltaTime = timestamp - lastFrameTime;\n  if (deltaTime > 20) console.warn("Slow frame detected");\n  lastFrameTime = timestamp;\n}'
        });
    }

    /**
     * Generate a comprehensive report
     */
    generateReport() {
        this.generateRecommendations();
        
        return {
            summary: {
                totalIssues: this.issues.length,
                highSeverityIssues: this.issues.filter(i => i.severity === 'HIGH').length,
                mediumSeverityIssues: this.issues.filter(i => i.severity === 'MEDIUM').length,
                lowSeverityIssues: this.issues.filter(i => i.severity === 'LOW').length
            },
            results: this.results,
            issues: this.issues,
            recommendations: this.recommendations
        };
    }
}

// Export for use in analysis
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoordinateAnalyzer;
} else if (typeof window !== 'undefined') {
    window.CoordinateAnalyzer = CoordinateAnalyzer;
}