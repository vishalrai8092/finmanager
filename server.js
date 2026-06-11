const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store for the MVP
let database = {
    income: [
        { id: 1, source: 'Salary', amount: 50000, date: '2026-06-01' }
    ],
    expenses: [
        { id: 1, title: 'Swiggy/Zomato', amount: 4500, category: 'Food', date: '2026-06-02' },
        { id: 2, title: 'Electricity Bill', amount: 3000, category: 'Bills', date: '2026-06-04' },
        { id: 3, title: 'Uber Ride', amount: 1200, category: 'Travel', date: '2026-06-05' },
        { id: 4, title: 'Mall Shopping', amount: 8000, category: 'Shopping', date: '2026-06-08' }
    ],
    budgets: {
        Food: 8000,
        Travel: 5000,
        Shopping: 10000,
        Bills: 15000,
        Entertainment: 5000,
        Education: 5000
    }
};

// --- DATA API ENDPOINTS ---

app.get('/api/data', (req, res) => {
    res.json(database);
});

app.post('/api/income', (req, res) => {
    const { source, amount, date } = req.body;
    const newIncome = { id: Date.now(), source, amount: parseFloat(amount), date };
    database.income.push(newIncome);
    res.status(210).json(newIncome);
});

app.post('/api/expense', (req, res) => {
    const { title, amount, category, date } = req.body;
    const newExpense = { id: Date.now(), title, amount: parseFloat(amount), category, date };
    database.expenses.push(newExpense);
    res.status(210).json(newExpense);
});

app.delete('/api/expense/:id', (req, res) => {
    const id = parseInt(req.params.id);
    database.expenses = database.expenses.filter(exp => exp.id !== id);
    res.json({ success: true, message: 'Expense deleted successfully.' });
});

// --- ADVANCED FEATURES: AI & PREDICTION ---

app.post('/api/ai-advisor', (req, res) => {
    const { question } = req.body;
    const totalIncome = database.income.reduce((sum, inc) => sum + inc.amount, 0);
    const totalExpenses = database.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Find food expenses for tailored advice
    const foodExpenses = database.expenses
        .filter(exp => exp.category === 'Food')
        .reduce((sum, exp) => sum + exp.amount, 0);

    const foodPercentage = totalExpenses > 0 ? ((foodExpenses / totalExpenses) * 100).toFixed(0) : 0;
    const potentialSavings = (foodExpenses * 0.20).toFixed(0);

    let answer = "I've analyzed your financial patterns. Overall, your savings rate looks steady, but keeping a closer eye on flexible lifestyle choices will give you more breathing room.";

    if (question.toLowerCase().includes('save') || question.toLowerCase().includes('money')) {
        if (foodExpenses > 2000) {
            answer = `You spent around ${foodPercentage}% of your total expenses on food delivery and dining out. Reducing this specific category by just 20% could effortlessly save you around ₹${potentialSavings} this month! Try meal prepping on weekends.`;
        } else {
            answer = `Your baseline expenses are well-managed. To save more, look into automating a recurring fixed deposit of 10% of your Salary immediately on payday before you begin spending.`;
        }
    } else if (question.toLowerCase().includes('budget') || question.toLowerCase().includes('predict')) {
        answer = `Based on your recent dynamic behavior, your next month's predictive outflow will hover around ₹${(totalExpenses * 1.05).toFixed(0)}. I recommend scaling back on 'Shopping' to keep a healthy financial buffer.`;
    }

    res.json({ answer });
});

// Mock Receipt Scanner
app.post('/api/receipt-scanner', (req, res) => {
    // Mimicking random OCR extraction from an uploaded image
    const standardMocks = [
        { title: 'Starbucks Coffee', amount: 450, category: 'Food' },
        { title: 'Zara Clothing', amount: 3499, category: 'Shopping' },
        { title: 'BookMyShow Movie', amount: 720, category: 'Entertainment' }
    ];
    const randomPick = standardMocks[Math.floor(Math.random() * standardMocks.length)];
    res.json({ success: true, extracted: randomPick });
});
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.listen(PORT, () => {
    console.log(`FinManager AI Server running safely on http://localhost:${PORT}`);
});
 
