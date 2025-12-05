// Frontend JavaScript for price comparison tool

const form = document.getElementById('search-form');
const input = document.getElementById('product-input');
const searchMode = document.getElementById('search-mode');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
const resultsSection = document.getElementById('results-section');
const productName = document.getElementById('product-name');
const resultCount = document.getElementById('result-count');
const resultsBody = document.getElementById('results-body');

// Handle form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const inputValue = input.value.trim();
    if (!inputValue) {
        showError('Please enter a product name or URL');
        return;
    }

    await searchProduct(inputValue);
});

// Search for product
async function searchProduct(productInput) {
    // Hide previous results/errors
    hideAll();

    // Show loading
    loading.classList.remove('hidden');

    try {
        const mode = searchMode.value;
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input: productInput, mode }),
        });

        const data = await response.json();

        // Hide loading
        loading.classList.add('hidden');

        if (!data.success) {
            showError(data.error || 'Failed to search for product');
            return;
        }

        displayResults(data);
    } catch (err) {
        loading.classList.add('hidden');
        showError('Network error. Please try again.');
        console.error('Search error:', err);
    }
}

// Display results
function displayResults(data) {
    if (!data.results || data.results.length === 0) {
        showError('No prices found for this product');
        return;
    }

    // Set product name
    productName.textContent = data.productName;
    resultCount.textContent = data.results.length;

    // Clear previous results
    resultsBody.innerHTML = '';

    // Add results to table
    data.results.forEach((result, index) => {
        const row = document.createElement('tr');

        // Add best-price class to first result (lowest price)
        if (index === 0) {
            row.classList.add('best-price');
        }

        row.innerHTML = `
            <td><span class="rank">#${index + 1}</span></td>
            <td><strong>${escapeHtml(result.retailer)}</strong></td>
            <td><span class="price">${formatPrice(result.currentPrice, result.currency)}</span></td>
            <td>${formatDiscount(result.discount, result.originalPrice, result.currency)}</td>
            <td><a href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer" class="view-button">View</a></td>
        `;

        resultsBody.appendChild(row);
    });

    // Show results
    resultsSection.classList.remove('hidden');
}

// Format price with currency symbol
function formatPrice(price, currency) {
    const symbols = {
        'USD': '$',
        'GBP': '£',
        'EUR': '€',
        'CAD': 'CA$',
        'AUD': 'A$',
    };

    const symbol = symbols[currency] || currency;
    return `${symbol}${price.toFixed(2)}`;
}

// Format discount information
function formatDiscount(discountPercent, originalPrice, currency) {
    if (discountPercent) {
        let html = `<span class="discount">${discountPercent}% OFF</span>`;
        if (originalPrice) {
            html += `<br><small style="color: #999; text-decoration: line-through;">${formatPrice(originalPrice, currency)}</small>`;
        }
        return html;
    }
    return '<span class="no-discount">-</span>';
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    error.classList.remove('hidden');
}

// Hide all sections
function hideAll() {
    loading.classList.add('hidden');
    error.classList.add('hidden');
    resultsSection.classList.add('hidden');
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
