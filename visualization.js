function createSVGElement(type, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', type);
    Object.entries(attrs).forEach(([key, value]) => {
        el.setAttribute(key, value);
    });
    return el;
}

function clearCanvas(canvasId) {
    const svg = document.getElementById(canvasId);
    // Keep <defs> and the grid <rect> intact
    while (svg.children.length > 2) {
        svg.removeChild(svg.lastChild);
    }
}

function drawSquare(svg, x, y, size, fill, stroke = '#333', strokeWidth = 2.5) {
    const rect = createSVGElement('rect', {
        x, y, width: size, height: size,
        fill, stroke, 'stroke-width': strokeWidth,
        class: 'rect'
    });
    svg.appendChild(rect);
    return rect;
}

function drawRect(svg, x, y, width, height, fill, stroke = '#333', strokeWidth = 2.5) {
    const rect = createSVGElement('rect', {
        x, y, width, height,
        fill, stroke, 'stroke-width': strokeWidth,
        class: 'rect'
    });
    svg.appendChild(rect);
    return rect;
}

function drawText(svg, x, y, text, fontSize = 18, fill = '#333') {
    const textEl = createSVGElement('text', {
        x, y,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        fill,
        'font-size': fontSize,
        'font-family': 'Lora, serif',
        class: 'label'
    });
    textEl.textContent = text;
    svg.appendChild(textEl);
    return textEl;
}

function drawDashedRect(svg, x, y, width, height, stroke = '#5e35b1', strokeWidth = 3) {
    const rect = createSVGElement('rect', {
        x, y, width, height,
        fill: 'none',
        stroke,
        'stroke-width': strokeWidth,
        'stroke-dasharray': '8,4'
    });
    svg.appendChild(rect);
    return rect;
}

function visualizeStep(exampleIndex, stepIndex) {
    const example = EXAMPLES[exampleIndex];
    const params = example.visualParams;
    const canvasId = `canvas${exampleIndex}`;
    const svg = document.getElementById(canvasId);
    
    clearCanvas(canvasId);
    
    const { baseSize, addSize, startX, startY, type } = params;
    
    switch (stepIndex) {
        case 0:
            break;
            
        case 1:
            drawSquare(svg, startX, startY, baseSize, '#90EE90', '#2d5016', 3);
            drawText(svg, startX + baseSize/2, startY - 15, 'x', 20);
            drawText(svg, startX - 20, startY + baseSize/2, 'x', 20);
            drawText(svg, startX + baseSize/2, startY + baseSize/2, 'x²', 24, '#1a3a0f');
            break;
            
        case 2:
            drawSquare(svg, startX, startY, baseSize, '#90EE90', '#2d5016', 3);
            if (type === 'plus') {
                // add rectangles to the right (positive case)
                drawRect(svg, startX + baseSize, startY, addSize/2, baseSize, '#B8E6B8', '#2d5016', 2.5);
                drawRect(svg, startX + baseSize + addSize/2, startY, addSize/2, baseSize, '#B8E6B8', '#2d5016', 2.5);
                drawText(svg, startX + baseSize/2, startY - 15, 'x', 20);
                drawText(svg, startX - 20, startY + baseSize/2, 'x', 20);
            } else {
                // subtract rectangle inside the x^2 square (negative case)
                const label = exampleIndex === 1 ? '1.5' : '5/6';
                drawRect(svg, startX + baseSize - addSize, startY, addSize, baseSize, 'rgba(255,0,0,0.25)', '#CC0000', 2.5);
                drawText(svg, startX + baseSize/2, startY - 15, 'x', 20);
                drawText(svg, startX - 20, startY + baseSize/2, 'x', 20);
                drawText(svg, startX + baseSize - addSize/2, startY - 15, label, 16);
            }
            break;
            
        case 3:
            drawSquare(svg, startX, startY, baseSize, '#90EE90', '#2d5016', 3);
            if (type === 'plus') {
                drawRect(svg, startX + baseSize, startY, addSize/2, baseSize, '#B8E6B8', '#2d5016', 2.5);
                drawRect(svg, startX, startY + baseSize, baseSize, addSize/2, '#B8E6B8', '#2d5016', 2.5);
                drawText(svg, startX + baseSize/2, startY - 15, 'x', 20);
                drawText(svg, startX - 20, startY + baseSize/2, 'x', 20);
            } else {
                const label = exampleIndex === 1 ? '1.5' : '5/6';
                // two subtracted halves inside the x^2 square
                drawRect(svg, startX + baseSize - addSize/2, startY, addSize/2, baseSize, 'rgba(255,0,0,0.25)', '#CC0000', 2.5);
                drawRect(svg, startX, startY + baseSize - addSize/2, baseSize, addSize/2, 'rgba(255,0,0,0.25)', '#CC0000', 2.5);
                drawText(svg, startX + baseSize/2, startY - 15, 'x', 20);
                drawText(svg, startX - 20, startY + baseSize/2, 'x', 20);
                drawText(svg, startX + baseSize - addSize/4, startY - 15, label, 16);
                drawText(svg, startX + baseSize/2, startY + baseSize - addSize/4, label, 16);
            }
            break;
            
        case 4:
            drawSquare(svg, startX, startY, baseSize, '#90EE90', '#2d5016', 3);
            if (type === 'plus') {
                drawRect(svg, startX + baseSize, startY, addSize/2, baseSize, '#B8E6B8', '#2d5016', 2.5);
                drawRect(svg, startX, startY + baseSize, baseSize, addSize/2, '#B8E6B8', '#2d5016', 2.5);
                drawSquare(svg, startX + baseSize, startY + baseSize, addSize/2, '#FFD93D', '#FF8C00', 3);
                
                drawDashedRect(svg, startX, startY, baseSize + addSize/2, baseSize + addSize/2);
                
                drawText(svg, startX + baseSize/2, startY - 15, 'x', 20);
                const label = exampleIndex === 0 ? '2' : '1.5';
                drawText(svg, startX + baseSize + addSize/4, startY - 15, label, 18);
                drawText(svg, startX - 20, startY + baseSize/2, 'x', 20);
                drawText(svg, startX - 30, startY + baseSize + addSize/4, label, 18);
                drawText(svg, startX + baseSize + addSize/4, startY + baseSize + addSize/4, exampleIndex === 0 ? '4' : '2.25', 16);
                drawText(svg, startX + (baseSize + addSize/2)/2, startY + baseSize + addSize/2 + 25, 
                         exampleIndex === 0 ? 'x + 2' : 'x + 1.5', 20, '#5e35b1');
            } else {
                const label = exampleIndex === 1 ? '1.5' : '5/6';
                // show two removed halves and the missing corner inside
                drawRect(svg, startX + baseSize - addSize/2, startY, addSize/2, baseSize, 'rgba(255,0,0,0.25)', '#CC0000', 2.5);
                drawRect(svg, startX, startY + baseSize - addSize/2, baseSize, addSize/2, 'rgba(255,0,0,0.25)', '#CC0000', 2.5);
                drawSquare(svg, startX + baseSize - addSize/2, startY + baseSize - addSize/2, addSize/2, '#FFD93D', '#FF8C00', 3);
                drawDashedRect(svg, startX, startY, baseSize - addSize/2, baseSize - addSize/2);
                drawText(svg, startX + baseSize/2, startY - 15, 'x', 20);
                drawText(svg, startX - 20, startY + baseSize/2, 'x', 20);
                drawText(svg, startX + baseSize - addSize/4, startY - 15, label, 16);
                drawText(svg, startX + baseSize/2, startY + baseSize - addSize/4, label, 16);
            }
            break;
            
        case 5:
            const resultSize = 120;
            const centerX = 225;
            const centerY = 180;
            
            drawSquare(svg, centerX - resultSize/2, centerY - resultSize/2, resultSize, '#E8F5E9', '#2d5016', 3);
            
            if (type === 'plus') {
                const sideLabel = exampleIndex === 0 ? 'x + 2 = ±3' : 'x + 1.5 = ±2.5';
                drawText(svg, centerX, centerY, sideLabel, 20, '#1a3a0f');
                drawText(svg, centerX, centerY - resultSize/2 - 20, exampleIndex === 0 ? '3' : '2.5', 22, '#5e35b1');
                drawText(svg, centerX - resultSize/2 - 25, centerY, exampleIndex === 0 ? '3' : '2.5', 22, '#5e35b1');
            } else {
                const sideLabel = exampleIndex === 1 ? 'x - 1.5 = ±2.5' : 'x - 5/6 = ±√13/6';
                drawText(svg, centerX, centerY, sideLabel, 18, '#1a3a0f');
                const sqrtLabel = exampleIndex === 1 ? '2.5' : '√13/6';
                drawText(svg, centerX, centerY - resultSize/2 - 20, sqrtLabel, 20, '#5e35b1');
                drawText(svg, centerX - resultSize/2 - 30, centerY, sqrtLabel, 20, '#5e35b1');
            }
            
            drawText(svg, centerX, centerY + resultSize/2 + 50, 
                     exampleIndex === 0 ? 'x = 1 hoặc x = -5' : 
                     exampleIndex === 1 ? 'x = 4 hoặc x = -1' : 
                     'x = (5±√13)/6', 
                     22, '#28a745');
            break;
    }
}
