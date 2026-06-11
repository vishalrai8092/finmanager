let currentTab = 'expense';
let expenseChartInstance = null;
let budgets = {};

document.addEventListener('DOMContentLoaded', () => {
    // Set modern execution date standard safely
    document.getElementById('tx-date').value = '2026-06-12';
    refreshDataHub();
});

function switchTab(type) {
    currentTab = type;
    const expBtn = document.getElementById('tab-exp');
    const incBtn = document.getElementById('tab-inc');
    const categoryGroup = document.getElementById('category-group');
    const lblDescription = document.getElementById('lbl-title');

    if (type === 'expense') {
        expBtn.classList.add('active');
        incBtn.classList.remove('active');
        categoryGroup.style.display = 'block';
        lblDescription.innerText = 'Expense Description';
    } else {
        incBtn.classList.add('active');
        expBtn.classList.remove('active');
        categoryGroup.style.display = 'none';
        lblDescription.innerText = 'Income Source';
    }
}

async function refreshDataHub() {
    const response = await fetch('/api/data');
    const data = await response.json();
    budgets = data.budgets;

    // Recalculate financial updates
    const totalIncome = data.income.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
    const netBalance = totalIncome - totalExpenses;

    document.getElementById('txt-income').innerText = `₹${totalIncome.toLocaleString('en-IN')}`;
    document.getElementById('txt-expenses').innerText = `₹${totalExpenses.toLocaleString('en-IN')}`;
    document.getElementById('txt-balance').innerText = `₹${netBalance.toLocaleString('en-IN')}`;

    evaluateSmartAlerts(data.expenses);
    renderTableLogs(data.expenses);
    generateVisualizationChart(data.expenses);
}

function evaluateSmartAlerts(expenses) {
    const alertBanner = document.getElementById('alert-banner');
    
    // Group categories to verify threshold breach limits
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
    const title = document.getElementById('tx-title').value;
    const amount = document.getElementById('tx-amount').value;
    const date = document.getElementById('tx-date').value;
    
    let endpoint = '/api/expense';
    let bodyPayload = { title, amount, date };

    if (currentTab === 'expense') {
        bodyPayload.category = document.getElementById('tx-category').value;
    } else {
        endpoint = '/api/income';
        bodyPayload.source = title; 
    }

    await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
    });

    document.getElementById('tx-title').value = '';
    document.getElementById('tx-amount').value = '';
    refreshDataHub();
}

async function deleteExpenseItem(id) {
    await fetch(`/api/expense/${id}`, { method: 'DELETE' });
    refreshDataHub();
}

function renderTableLogs(expenses) {
    const tbody = document.getElementById('expense-rows');
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
    const categories = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Education'];
    const totals = categories.map(cat => {
        return expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
    });

    const ctx = document.getElementById('expenseChart').getContext('2d');
    
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
    const userQuery = queryField.value.trim();
    if (!userQuery) return;

    const chatBox = document.getElementById('chat-output');
    
    // Append User Message
    const userDiv = document.createElement('p');
    userDiv.className = 'user-msg';
    userDiv.innerText = userQuery;
    chatBox.appendChild(userDiv);
    
    queryField.value = '';

    // Query Engine API
    const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuery })
    });
    const result = await response.json();

    // Append AI Output Response
    const aiDiv = document.createElement('p');
    aiDiv.className = 'ai-msg';
    aiDiv.innerText = result.answer;
    chatBox.appendChild(aiDiv);
    
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function scanReceipt() {
    const statusDiv = document.getElementById('scanner-status');
    statusDiv.innerText = "Scanning receipt image via optical AI lines...";
    
    const response = await fetch('/api/receipt-scanner', { method: 'POST' });
    const data = await response.json();

    if(data.success) {
        statusDiv.innerHTML = `<span style="color: green;">✓ Populated: Found ${data.extracted.title} (₹${data.extracted.amount})</span>`;
        document.getElementById('tx-title').value = data.extracted.title;
        document.getElementById('tx-amount').value = data.extracted.amount;
        switchTab('expense');
        document.getElementById('tx-category').value = data.extracted.category;
    }
}
