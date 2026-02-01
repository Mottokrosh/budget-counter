const JSONBIN_API_KEY = '$2a$10$kONUzP1dSggEZJoJW8pdZuvguCTB5ndAD8Idw/JTt7SLdSl2oTypy'; // Your X-Master-Key from jsonbin.io
const JSONBIN_BIN_ID = '697f8b87ae596e708f097aa7';   // Your Bin ID (after creating a bin)

const API_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

let currentBudget = 0;

// Update the display
function updateDisplay() {
	document.getElementById('budgetDisplay').textContent = 
		`€${currentBudget.toFixed(2)}`;
	
	// Update spend buttons if they exist
	const spendBtn = document.getElementById('spendBtn');
	const spendHalfBtn = document.getElementById('spendHalfBtn');
	if (spendBtn) spendBtn.disabled = currentBudget < 1;
	if (spendHalfBtn) spendHalfBtn.disabled = currentBudget < 0.5;
}

// Show status message
function showStatus(message, isError = false) {
	const status = document.getElementById('status');
	status.textContent = message;
	status.className = isError ? 'status error' : 'status';
	if (!isError) {
		setTimeout(() => status.textContent = '', 2000);
	}
}

// Load budget from JSONBin
async function loadBudget() {
	try {
		const response = await fetch(API_URL, {
			headers: {
				'X-Master-Key': JSONBIN_API_KEY
			}
		});
		
		if (!response.ok) throw new Error('Failed to load');
		
		const data = await response.json();
		currentBudget = data.record.budget || 0;
		updateDisplay();
		showStatus('Loaded!');
	} catch (error) {
		console.error('Load error:', error);
		showStatus('Failed to load budget. Check your API key and Bin ID.', true);
	}
}

// Save budget to JSONBin
async function saveBudget() {
	try {
		showStatus('Saving...');
		const response = await fetch(API_URL, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'X-Master-Key': JSONBIN_API_KEY
			},
			body: JSON.stringify({ budget: currentBudget })
		});
		
		if (!response.ok) throw new Error('Failed to save');
		
		showStatus('Saved!');
	} catch (error) {
		console.error('Save error:', error);
		showStatus('Failed to save budget', true);
	}
}

// Spend a specific amount
async function spend(amount) {
	if (currentBudget < amount) return;
	currentBudget = Math.max(0, currentBudget - amount);
	updateDisplay();
	await saveBudget();
}

// Adjust budget by amount (for admin)
async function adjustBudget(delta) {
	currentBudget += delta;
	updateDisplay();
	await saveBudget();
}

// Set budget to specific value (for admin)
async function setBudget() {
	const newValue = parseFloat(document.getElementById('newBudget').value);
	if (isNaN(newValue)) {
		showStatus('Please enter a valid number', true);
		return;
	}
	currentBudget = newValue;
	updateDisplay();
	await saveBudget();
	document.getElementById('newBudget').value = '';
}

// Get amount from input (for admin)
function amount() {
	return parseFloat(document.getElementById('amount').value) || 0;
}

// Load on startup
loadBudget();
