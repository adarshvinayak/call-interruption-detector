// shadcn-inspired UI functionality

// Function to update slider UI
function updateSliderUI(slider, valueId) {
    // Update the value display
    const valueElement = document.getElementById(valueId);
    if (valueElement) {
        valueElement.textContent = slider.value;
    }
    
    // Update the slider range and thumb position
    const sliderContainer = slider.closest('.shadcn-slider');
    if (sliderContainer) {
        const range = sliderContainer.querySelector('.shadcn-slider-range');
        const thumb = sliderContainer.querySelector('.shadcn-slider-thumb');
        
        if (range && thumb) {
            // Calculate percentage
            const min = parseFloat(slider.min) || 0;
            const max = parseFloat(slider.max) || 100;
            const value = parseFloat(slider.value) || 0;
            const percentage = ((value - min) / (max - min)) * 100;
            
            // Update UI elements
            range.style.width = `${percentage}%`;
            thumb.style.left = `${percentage}%`;
        }
    }
    
    // Call the original event handlers if they exist
    if (valueId === 'thresholdValue' && typeof updateThresholdValue === 'function') {
        updateThresholdValue();
    } else if (valueId === 'minDurationValue' && typeof updateMinDurationValue === 'function') {
        updateMinDurationValue();
    }
}

// Initialize sliders when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize threshold slider
    const thresholdSlider = document.getElementById('thresholdSlider');
    if (thresholdSlider) {
        updateSliderUI(thresholdSlider, 'thresholdValue');
        thresholdSlider.addEventListener('input', function() {
            updateSliderUI(this, 'thresholdValue');
        });
    }
    
    // Initialize min duration slider
    const minDurationSlider = document.getElementById('minDurationSlider');
    if (minDurationSlider) {
        updateSliderUI(minDurationSlider, 'minDurationValue');
        minDurationSlider.addEventListener('input', function() {
            updateSliderUI(this, 'minDurationValue');
        });
    }
});