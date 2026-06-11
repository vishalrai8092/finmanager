let currentTab = 'expense';
let expenseChartInstance = null;
let budgets = {};

document.addEventListener('DOMContentLoaded', () => {
    // Safely set the input date value to today's date
    const dateInput = document.getElementById('tx-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    refreshDataHub();
});

function switchTab(type) {
    currentTab = type;
    const expBtn = document.getElementById('tab-exp');
    const incBtn = document.getElementById('tab-inc');
    const categoryGroup = document.getElementById('category-group');
    const lblDescription = document.getElementById('lbl-title');

    if (!expBtn || !incBtn) return;

    if (type === 'expense') {
        expBtn.classList.add('active');
        incBtn.classList.remove('active');
        if (categoryGroup) categoryGroup.style.display = 'block';
        if (lblDescription) lblDescription.innerText = 'Expense Description';
    } else {
        incBtn.classList.add('active');
        expBtn.classList.remove('active');
        if (categoryGroup) categoryGroup.style.display = 'none';
        if (lblDescription) lblDescription.innerText = 'Income Source';
    }
}

async function refreshDataHub() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        budgets = data.budgets || {};

        const totalIncome = data.income ? data.income.reduce((sum, i) => sum + i.amount, 0) : 0;
        const totalExpenses = data.expenses ? data.expenses.reduce((sum, e) => sum + e.amount, 0) : 0;
        const netBalance = totalIncome - totalExpenses;

        const incEl = document.getElementById('txt-income');
        const expEl = document.getElementById('txt-expenses');
        const balEl = document.getElementById('txt-balance');

        if (incEl) incEl.innerText = `₹${totalIncome.toLocaleString('en-IN')}`;
        if (expEl) expEl.innerText = `₹${totalExpenses.toLocaleString('en-IN')}`;
        if (balEl) balEl.innerText = `₹${netBalance.toLocaleString('en-IN')}`;

        evaluateSmartAlerts(data.expenses || []);
        renderTableLogs(data.expenses || []);
        generateVisualizationChart(data.expenses || []);
    } catch (err) {
        console.error("Error refreshing dashboard data:", err);
    }
}

function evaluateSmartAlerts(expenses) {
    const alertBanner = document.getElementById('alert-banner');
    if (!alertBanner) return;
    
    const usage = {};
    expenses.forEach(exp => {
        usage[exp.category] = (usage[exp.category] || 0) + exp.amount;
    });

    let alertMessage = "";
    for (const category in usage) {
        if (budgets[category] && usage[category] > budgets[category]) {
            alertMessage = `🚨 Budget Exceeded alert! Your spending in [${category}] has reached ₹${usage[category]} (Limit: ₹${budgets[category]}).`;
            break;
        }
    }

    if (alertMessage) {
        alertBanner.innerText = alertMessage;
        alertBanner.className = "alert-active";
    } else {
        alertBanner.className = "alert-hidden";
    }
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    const titleEl = document.getElementById('tx-title');
    const amountEl = document.getElementById('tx-amount');
    const dateEl = document.getElementById('tx-date');
    const catEl = document.getElementById('tx-category');

    if (!titleEl || !amountEl || !dateEl) return;

    const title = titleEl.value;
    const amount = amountEl.value;
    const date = dateEl.value;
    
    let endpoint = '/api/expense';
    let bodyPayload = { title, amount, date };

    if (currentTab === 'expense') {
        bodyPayload.category = catEl ? catEl.value : 'Food';
    } else {
        endpoint = '/api/income';
        bodyPayload.source = title; 
    }

    await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
    });

    titleEl.value = '';
    amountEl.value = '';
    refreshDataHub();
}

async function deleteExpenseItem(id) {
    await fetch(`/api/expense/${id}`, { method: 'DELETE' });
    refreshDataHub();
}

function renderTableLogs(expenses) {
    const tbody = document.getElementById('expense-rows');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    expenses.forEach(exp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${exp.title}</td>
            <td><span class="subtitle">${exp.category}</span></td>
            <td><strong>₹${exp.amount}</strong></td>
            <td><button class="btn-delete" onclick="deleteExpenseItem(${exp.id})">Remove</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function generateVisualizationChart(expenses) {
    const canvas = document.getElementById('expenseChart');
    if (!canvas) return;

    const categories = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Education'];
    const totals = categories.map(cat => {
        return expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
    });

    const ctx = canvas.getContext('2d');
    
    if (expenseChartInstance) {
        expenseChartInstance.destroy();
    }

    expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: totals,
                backgroundColor: ['#f87171', '#60a5fa', '#fbbf24', '#34d399', '#a78bfa', '#f472b6']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

async function askAIAdvisor() {
    const queryField = document.getElementById('ai-input');
    if (!queryField) return;

    const userQuery = queryField.value.trim();
    if (!userQuery) return;

    const chatBox = document.getElementById('chat-output');
    if (!chatBox) return;
    
    const userDiv = document.createElement('p');
    userDiv.className = 'user-msg';
    userDiv.innerText = userQuery;
    chatBox.appendChild(userDiv);
    
    queryField.value = '';

    const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuery })
    });
    const result = await response.json();

    const aiDiv = document.createElement('p');
    aiDiv.className = 'ai-msg';
    aiDiv.innerText = result.answer;
    chatBox.appendChild(aiDiv);
    
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function scanReceipt() {
    const statusDiv = document.getElementById('scanner-status');
    if (!statusDiv) return;

    statusDiv.innerText = "Scanning receipt image via optical AI lines...";
    
    const response = await fetch('/api/receipt-scanner', { method: 'POST' });
    const data = await response.json();

    if (data.success) {
        statusDiv.innerHTML = `<span style="color: green;">✓ Populated: Found ${data.extracted.title} (₹${data.extracted.amount})</span>`;
        
        const titleEl = document.getElementById('tx-title');
        const amountEl = document.getElementById('tx-amount');
        const catEl = document.getElementById('tx-category');

        if (titleEl) titleEl.value = data.extracted.title;
        if (amountEl) amountEl.value = data.extracted.amount;
        switchTab('expense');
        if (catEl) catEl.value = data.extracted.category;
    }
}
