let currentSteps = [0, 0, 0];
let currentTab = 0;

function switchTab(tabIndex) {
    document.querySelectorAll('.tab-button').forEach((btn, i) => {
        btn.classList.toggle('active', i === tabIndex);
    });
    
    document.querySelectorAll('.tab-content').forEach((content, i) => {
        content.classList.toggle('active', i === tabIndex);
    });
    
    currentTab = tabIndex;
    
    if (!document.getElementById(`steps${tabIndex}`).hasChildNodes()) {
        initializeExample(tabIndex);
    }
    
    renderStep(tabIndex);
    // Typeset math in tab labels after switching
    if (typeof MathJax !== 'undefined') {
        const tabs = document.querySelector('.tabs');
        MathJax.typesetPromise([tabs]).catch((err) => console.log('MathJax tabs error:', err));
    }
}

function initializeExample(exampleIndex) {
    const example = EXAMPLES[exampleIndex];
    const stepsContainer = document.getElementById(`steps${exampleIndex}`);
    const indicatorsContainer = document.getElementById(`indicators${exampleIndex}`);
    
    stepsContainer.innerHTML = '';
    indicatorsContainer.innerHTML = '';
    
    example.steps.forEach((step, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step';
        stepDiv.dataset.step = index;
        stepDiv.style.display = 'none';
        
        stepDiv.innerHTML = `
            <div class="step-title">
                <span class="step-number">${index + 1}</span>
                ${step.title}
            </div>
            <div class="step-content">
                ${step.content}
            </div>
        `;
        
        stepsContainer.appendChild(stepDiv);
        
        const indicator = document.createElement('div');
        indicator.className = 'step-indicator';
        indicator.textContent = index + 1;
        indicator.onclick = () => goToStep(exampleIndex, index);
        indicatorsContainer.appendChild(indicator);
    });
}

function goToStep(exampleIndex, stepIndex) {
    currentSteps[exampleIndex] = stepIndex;
    renderStep(exampleIndex);
}

function renderStep(exampleIndex) {
    const stepIndex = currentSteps[exampleIndex];
    const example = EXAMPLES[exampleIndex];
    
    document.querySelectorAll(`#steps${exampleIndex} .step`).forEach((step, i) => {
        step.style.display = i === stepIndex ? 'block' : 'none';
    });
    
    document.querySelectorAll(`#indicators${exampleIndex} .step-indicator`).forEach((indicator, i) => {
        indicator.classList.remove('active', 'completed');
        if (i === stepIndex) {
            indicator.classList.add('active');
        } else if (i < stepIndex) {
            indicator.classList.add('completed');
        }
    });
    
    // Right panel no longer displays a formula box
    
    const stepsContent = document.querySelector(`#steps${exampleIndex} .step[data-step="${stepIndex}"]`);
    if (stepsContent && typeof MathJax !== 'undefined') {
        MathJax.typesetPromise([stepsContent]).catch((err) => console.log('MathJax error:', err));
    }
    
    visualizeStep(exampleIndex, stepIndex);
    updateNavButtons(exampleIndex);
}

function updateNavButtons(exampleIndex) {
    const stepIndex = currentSteps[exampleIndex];
    const totalSteps = EXAMPLES[exampleIndex].steps.length;
    const prevBtn = document.getElementById(`prev${exampleIndex}`);
    const nextBtn = document.getElementById(`next${exampleIndex}`);
    if (prevBtn && nextBtn) {
        prevBtn.disabled = stepIndex === 0;
        nextBtn.disabled = stepIndex === totalSteps - 1;
    }
}

function nextStep(exampleIndex) {
    const totalSteps = EXAMPLES[exampleIndex].steps.length;
    if (currentSteps[exampleIndex] < totalSteps - 1) {
        currentSteps[exampleIndex]++;
        renderStep(exampleIndex);
    }
}

function prevStep(exampleIndex) {
    if (currentSteps[exampleIndex] > 0) {
        currentSteps[exampleIndex]--;
        renderStep(exampleIndex);
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
        nextStep(currentTab);
    } else if (e.key === 'ArrowLeft') {
        prevStep(currentTab);
    } else if (e.key === 'Home') {
        currentSteps[currentTab] = 0;
        renderStep(currentTab);
    }
});

window.addEventListener('DOMContentLoaded', () => {
    initializeExample(0);
    renderStep(0);
    if (typeof MathJax !== 'undefined') {
        const tabs = document.querySelector('.tabs');
        MathJax.typesetPromise([tabs]).catch((err) => console.log('MathJax tabs error:', err));
    }
});
