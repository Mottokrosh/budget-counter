const JSONBIN_API_KEY = '$2a$10$kONUzP1dSggEZJoJW8pdZuvguCTB5ndAD8Idw/JTt7SLdSl2oTypy'; // Your X-Master-Key from jsonbin.io
const JSONBIN_BIN_ID = '697f8b87ae596e708f097aa7';   // Your Bin ID (after creating a bin)

const API_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

const WEEKLY_BUDGET = 7; // €7 per week default
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']; // German abbreviations

let currentBudget = 0;
let dailySpending = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun spending
let weekStart = null; // ISO date string of the Monday of current week

// Get the Monday of the current week
function getWeekStart(date = new Date()) {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
	d.setHours(0, 0, 0, 0);
	d.setDate(diff);
	return d.toISOString().split('T')[0];
}

// Get current day index (0 = Monday, 6 = Sunday)
function getCurrentDayIndex() {
	const day = new Date().getDay();
	return day === 0 ? 6 : day - 1; // Convert Sunday=0 to index 6
}

// Check if we need to reset for a new week
function checkWeekReset(savedWeekStart) {
	const currentWeekStart = getWeekStart();
	if (savedWeekStart !== currentWeekStart) {
		// New week - reset everything
		currentBudget = WEEKLY_BUDGET;
		dailySpending = [0, 0, 0, 0, 0, 0, 0];
		weekStart = currentWeekStart;
		return true; // Indicates a reset happened
	}
	return false;
}

// Update the display
function updateDisplay() {
	document.getElementById('budgetDisplay').textContent = 
		`€${currentBudget.toFixed(2)}`;
	
	// Update spend buttons if they exist
	const spendBtn = document.getElementById('spendBtn');
	const spendHalfBtn = document.getElementById('spendHalfBtn');
	if (spendBtn) spendBtn.disabled = currentBudget < 1;
	if (spendHalfBtn) spendHalfBtn.disabled = currentBudget < 0.5;
	
	// Update weekly spending table if it exists
	updateWeeklyTable();
}

// Update the weekly spending table
function updateWeeklyTable() {
	const table = document.getElementById('weeklyTable');
	if (!table) return;
	
	const todayIndex = getCurrentDayIndex();
	
	let html = '<tr>';
	// Header row with day names
	WEEKDAYS.forEach((day, index) => {
		let className = 'day-cell';
		if (index < todayIndex) className += ' day-past';
		else if (index === todayIndex) className += ' day-today';
		else className += ' day-future';
		html += `<th class="${className}">${day}</th>`;
	});
	html += '</tr><tr>';
	
	// Spending row
	WEEKDAYS.forEach((day, index) => {
		let className = 'day-cell';
		if (index < todayIndex) className += ' day-past';
		else if (index === todayIndex) className += ' day-today';
		else className += ' day-future';
		const spent = dailySpending[index] || 0;
		html += `<td class="${className}">${spent > 0 ? '€' + spent.toFixed(2) : '–'}</td>`;
	});
	html += '</tr>';
	
	table.innerHTML = html;
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
		const record = data.record;
		
		// Check for week reset before applying saved values
		const savedWeekStart = record.weekStart || getWeekStart();
		const needsReset = checkWeekReset(savedWeekStart);
		
		if (!needsReset) {
			// Use saved values
			currentBudget = record.budget ?? WEEKLY_BUDGET;
			dailySpending = record.dailySpending || [0, 0, 0, 0, 0, 0, 0];
			weekStart = savedWeekStart;
		}
		
		updateDisplay();
		
		// If we reset, save the new state
		if (needsReset) {
			showStatus('Neue Woche gestartet!');
			await saveBudget();
		} else {
			showStatus('Loaded!');
		}
	} catch (error) {
		console.error('Load error:', error);
		// Initialize with defaults on error
		currentBudget = WEEKLY_BUDGET;
		dailySpending = [0, 0, 0, 0, 0, 0, 0];
		weekStart = getWeekStart();
		updateDisplay();
		showStatus('Failed to load budget. Using defaults.', true);
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
			body: JSON.stringify({ 
				budget: currentBudget,
				dailySpending: dailySpending,
				weekStart: weekStart
			})
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
	
	// Track daily spending
	const todayIndex = getCurrentDayIndex();
	dailySpending[todayIndex] = (dailySpending[todayIndex] || 0) + amount;
	
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

// Reload when app becomes visible (for PWA)
document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'visible') {
		loadBudget();
	}
});
