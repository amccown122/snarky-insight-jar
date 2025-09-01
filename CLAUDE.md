# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Snarky Insight Jar is an interactive web application where users can add snarky insights that appear as coins dropping into a virtual jar. The main application is a standalone HTML file with embedded styling and JavaScript.

## Main Application

**File**: `Snarky-Insight-Jar-v12-4-no-double-draw.html` (~97k lines)
- Complete single-page application with embedded CSS and JavaScript
- Canvas-based coin jar visualization 
- LocalStorage persistence for user insights
- Category-based insight organization
- Animated coin dropping with physics

## Architecture

### Core Systems
- **Canvas Rendering**: HTML5 Canvas with device pixel ratio support for crisp display
- **Coordinate System**: Normalized coordinates (0-1) transformed to pixel positions within jar boundaries  
- **Mask System**: Image-based boundary detection to keep coins inside jar shape
- **Animation Engine**: Smooth coin dropping animations with collision avoidance
- **Data Layer**: LocalStorage for insight persistence across sessions

### Key Functions (in main HTML file)
- `fitCanvas()` - Canvas scaling with device pixel ratio handling
- `sampleInside()` - Generates valid coin positions within jar mask
- `renderFrame()` - Main rendering loop
- `addInsight()` - Creates new insight coins
- `ensureInside()` - Validates coin positions

## Active Issues to Fix

**Critical Coordinate System Problem**: Coins can appear outside jar boundaries due to:
- Inconsistent coordinate scaling between systems
- Missing boundary validation in coordinate transformation
- Mask alignment precision issues

**Files for debugging**: 
- `coordinate-analysis.js` - Diagnostic tools for coordinate accuracy
- `coordinate-fixes.js` - Corrected implementations ready for integration
- `performance-analysis-report.md` - Detailed issue analysis

## Development

### Testing
- Manual browser testing (no automated test framework)
- Performance validation through `performance-test.html`
- Coordinate validation through `test-coordinates.html`

### File Architecture
- Single-file HTML application for easy deployment
- Supporting analysis files for debugging coordinate issues
- No build process - direct browser execution