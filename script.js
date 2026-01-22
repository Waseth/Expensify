// ===========================
// STATE MANAGEMENT
// ===========================

const AppState = {
    // Budget Configuration
    monthlyAllowance: 0,
    fixedWeek1Budget: 0,
    weeks2to4Budget: 0,

    // Needs Categories
    needs: {
        fixed_week1: {
            allocated: 0,
            spent: 0,
            remaining: 0,
            expenses: []
        },
        week2: {
            allocated: 0,
            spent: 0,
            remaining: 0,
            expenses: []
        },
        week3: {
            allocated: 0,
            spent: 0,
            remaining: 0,
            expenses: []
        },
        week4: {
            allocated: 0,
            spent: 0,
            remaining: 0,
            expenses: []
        }
    },

    // Income Categories
    income: {
        total: 0,
        savings: {
            balance: 0,
            spent: 0,
            expenses: []
        },
        personal: {
            balance: 0,
            spent: 0,
            expenses: []
        }
    },

    // All Expenses (for history)
    allExpenses: [],

    // Month Tracking
    currentMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    lastResetDate: new Date().toISOString().split('T')[0]
};

// ===========================
// DOM ELEMENTS
// ===========================

// Navigation
const navButtons = document.querySelectorAll('.nav-btn');
const dashboards = document.querySelectorAll('.dashboard');

// Input Dashboard Elements
const monthlyAllowanceInput = document.getElementById('monthly-allowance');
const fixedWeek1BudgetInput = document.getElementById('fixed-week1-budget');
const weeks2to4BudgetDisplay = document.getElementById('weeks2-4-budget');
const updateBudgetButton = document.getElementById('update-budget');
const expenseForm = document.getElementById('expense-form');
const expenseCategorySelect = document.getElementById('expense-category');
const expenseDescriptionInput = document.getElementById('expense-description');
const expenseAmountInput = document.getElementById('expense-amount');
const expenseDateInput = document.getElementById('expense-date');

// Summary Display Elements
const summaryAllowance = document.getElementById('summary-allowance');
const summaryNeeds = document.getElementById('summary-needs');
const summarySpent = document.getElementById('summary-spent');
const summaryIncome = document.getElementById('summary-income');
const summarySavings = document.getElementById('summary-savings');
const summaryPersonal = document.getElementById('summary-personal');

// Charts
let needsBarChart = null;
let moneyPieChart = null;

// ===========================
// INITIALIZATION
// ===========================

function initApp() {
    // Set default date to today
    expenseDateInput.valueAsDate = new Date();

    // Set step for amount inputs to allow decimals
    monthlyAllowanceInput.step = '0.01';
    fixedWeek1BudgetInput.step = '0.01';
    expenseAmountInput.step = '0.01';

    // Update month display
    updateMonthDisplay();

    // Load saved state from localStorage
    loadFromLocalStorage();

    // Initialize event listeners
    setupEventListeners();

    // Initialize charts
    initCharts();

    // Update all UI
    updateAllDisplays();

    // Show welcome notification
    showNotification('Welcome to Expensify!.', 'success');
}

// ===========================
// EVENT LISTENERS
// ===========================

function setupEventListeners() {
    // Navigation
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const dashboardId = button.dataset.dashboard;
            switchDashboard(dashboardId);
        });
    });

    // Budget Update
    updateBudgetButton.addEventListener('click', updateBudget);

    // Expense Form Submission
    expenseForm.addEventListener('submit', addExpense);

    // Auto-calculate weeks 2-4 budget
    monthlyAllowanceInput.addEventListener('input', calculateWeeksBudget);
    fixedWeek1BudgetInput.addEventListener('input', calculateWeeksBudget);

    // Reset Month Button
    document.getElementById('reset-month').addEventListener('click', resetMonth);

    // Modal Close Button
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-confirm').addEventListener('click', closeModal);

    // Theme Toggler
    setupThemeToggler();
}

function setupThemeToggler() {
    const toggler = document.createElement('div');
    toggler.className = 'theme-toggler';
    toggler.innerHTML = `
        <button class="theme-toggle-btn" id="theme-toggle">
            <i class="fas fa-moon"></i>
        </button>
    `;
    document.body.appendChild(toggler);

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

// ===========================
// THEME MANAGEMENT
// ===========================

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? null : 'light';
    const icon = document.querySelector('#theme-toggle i');

    if (newTheme) {
        document.documentElement.setAttribute('data-theme', newTheme);
        icon.className = 'fas fa-sun';
        localStorage.setItem('budget-theme', 'light');
        showNotification('Switched to light theme', 'success');
    } else {
        document.documentElement.removeAttribute('data-theme');
        icon.className = 'fas fa-moon';
        localStorage.setItem('budget-theme', 'dark');
        showNotification('Switched to dark theme', 'success');
    }
}

// ===========================
// DASHBOARD NAVIGATION
// ===========================

function switchDashboard(dashboardId) {
    // Update active nav button
    navButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.dashboard === dashboardId);
    });

    // Show selected dashboard
    dashboards.forEach(dashboard => {
        dashboard.classList.toggle('active', dashboard.id === `${dashboardId}-dashboard`);
    });

    // Update specific dashboard if needed
    if (dashboardId === 'needs') {
        updateNeedsDashboard();
    } else if (dashboardId === 'income') {
        updateIncomeDashboard();
    }
}

// ===========================
// BUDGET CALCULATIONS
// ===========================

function calculateWeeksBudget() {
    const allowance = parseFloat(monthlyAllowanceInput.value) || 0;
    const week1Budget = parseFloat(fixedWeek1BudgetInput.value) || 0;

    if (allowance >= week1Budget && week1Budget > 0) {
        const remaining = allowance - week1Budget;
        const weeklyBudget = remaining / 3; // No rounding, keep exact decimal
        weeks2to4BudgetDisplay.textContent = `Rs ${formatCurrency(weeklyBudget)}`;
    } else {
        weeks2to4BudgetDisplay.textContent = 'Rs 0';
    }
}

function updateBudget() {
    const allowance = parseFloat(monthlyAllowanceInput.value);
    const week1Budget = parseFloat(fixedWeek1BudgetInput.value);

    if (!allowance || allowance <= 0) {
        showAlert('Invalid Input', 'Please enter a valid monthly allowance.');
        return;
    }

    if (!week1Budget || week1Budget <= 0) {
        showAlert('Invalid Input', 'Please enter a valid budget for Fixed + Week 1.');
        return;
    }

    if (week1Budget >= allowance) {
        showAlert('Invalid Budget', 'Week 1 budget cannot exceed monthly allowance.');
        return;
    }

    // Update state
    AppState.monthlyAllowance = allowance;
    AppState.fixedWeek1Budget = week1Budget;

    // Calculate weeks 2-4 budget (exact decimal)
    const remaining = allowance - week1Budget;
    AppState.weeks2to4Budget = remaining / 3;

    // Initialize needs allocations
    AppState.needs.fixed_week1.allocated = week1Budget;
    AppState.needs.fixed_week1.remaining = week1Budget;

    for (let i = 2; i <= 4; i++) {
        const weekKey = `week${i}`;
        AppState.needs[weekKey].allocated = AppState.weeks2to4Budget;
        AppState.needs[weekKey].remaining = AppState.weeks2to4Budget;
    }

    // Calculate initial income
    calculateIncome();

    // Update UI
    updateAllDisplays();
    saveToLocalStorage();

    showNotification('Budget updated successfully!', 'success');
}

// ===========================
// EXPENSE MANAGEMENT
// ===========================

function addExpense(e) {
    e.preventDefault();

    const amount = parseFloat(expenseAmountInput.value);
    const category = expenseCategorySelect.value;
    const description = expenseDescriptionInput.value.trim();
    const date = expenseDateInput.value;

    // Validation
    if (isNaN(amount) || amount <= 0) {
        showAlert('Invalid Amount', 'Please enter a valid expense amount.');
        return;
    }

    if (!category) {
        showAlert('Missing Category', 'Please select a category for the expense.');
        return;
    }

    if (!description) {
        showAlert('Missing Description', 'Please enter a description for the expense.');
        return;
    }

    if (!date) {
        showAlert('Missing Date', 'Please select a date for the expense.');
        return;
    }

    // Create expense object
    const expense = {
        id: Date.now(),
        amount: parseFloat(amount.toFixed(2)), // Store with 2 decimal places
        category: category,
        description: description,
        date: date,
        timestamp: new Date().toISOString()
    };

    // Add to appropriate category
    if (category.startsWith('week') || category === 'fixed_week1') {
        // Needs expense
        if (AppState.needs[category].remaining < amount) {
            const overspendAmount = (amount - AppState.needs[category].remaining).toFixed(2);
            if (!confirm(`This will overspend your ${getCategoryName(category)} budget by Rs ${formatCurrency(overspendAmount)}. Continue?`)) {
                return;
            }
        }

        AppState.needs[category].spent = parseFloat((AppState.needs[category].spent + amount).toFixed(2));
        AppState.needs[category].remaining = parseFloat((AppState.needs[category].remaining - amount).toFixed(2));
        AppState.needs[category].expenses.push(expense);

        // Check if this is an overspend
        if (AppState.needs[category].remaining < 0) {
            showNotification(`Warning: You've overspent your ${getCategoryName(category)} budget by Rs ${formatCurrency(Math.abs(AppState.needs[category].remaining))}!`, 'warning');
        }

    } else {
        // Income expense (Personal or Savings)
        if (AppState.income[category].balance < amount) {
            showAlert('Insufficient Funds', `You don't have enough balance in ${getCategoryName(category)}. Current balance: Rs ${formatCurrency(AppState.income[category].balance)}`);
            return;
        }

        AppState.income[category].spent = parseFloat((AppState.income[category].spent + amount).toFixed(2));
        AppState.income[category].balance = parseFloat((AppState.income[category].balance - amount).toFixed(2));
        AppState.income[category].expenses.push(expense);
    }

    // Add to all expenses
    AppState.allExpenses.unshift(expense);

    // Recalculate income after needs change
    if (category.startsWith('week') || category === 'fixed_week1') {
        calculateIncome();
    }

    // Update UI
    updateAllDisplays();
    saveToLocalStorage();

    // Reset form
    expenseForm.reset();
    expenseDateInput.valueAsDate = new Date();

    showNotification(`Expense added: ${description} - Rs ${formatCurrency(amount)}`, 'success');
}

function calculateIncome() {
    // Calculate total needs spent
    let totalNeedsSpent = 0;
    let totalNeedsAllocated = 0;

    Object.keys(AppState.needs).forEach(key => {
        totalNeedsSpent += AppState.needs[key].spent;
        totalNeedsAllocated += AppState.needs[key].allocated;
    });

    // Calculate surplus/deficit
    const needsDifference = parseFloat((totalNeedsAllocated - totalNeedsSpent).toFixed(2));

    // Update income (positive difference = surplus, negative = deficit)
    AppState.income.total = needsDifference;

    // Split income 50/50 between savings and personal (exact decimal split)
    const halfIncome = parseFloat((AppState.income.total / 2).toFixed(2));

    // Only add to balances if positive (surplus)
    if (halfIncome > 0) {
        AppState.income.savings.balance = parseFloat((AppState.income.savings.balance + halfIncome).toFixed(2));
        AppState.income.personal.balance = parseFloat((AppState.income.personal.balance + halfIncome).toFixed(2));
    } else if (halfIncome < 0) {
        // For deficit, subtract from balances proportionally
        const deficit = Math.abs(halfIncome);
        const totalAvailable = AppState.income.savings.balance + AppState.income.personal.balance;

        if (totalAvailable > 0) {
            const savingsShare = parseFloat(((AppState.income.savings.balance / totalAvailable) * deficit).toFixed(2));
            const personalShare = parseFloat(((AppState.income.personal.balance / totalAvailable) * deficit).toFixed(2));

            AppState.income.savings.balance = Math.max(0, parseFloat((AppState.income.savings.balance - savingsShare).toFixed(2)));
            AppState.income.personal.balance = Math.max(0, parseFloat((AppState.income.personal.balance - personalShare).toFixed(2)));
        }
    }
}

// ===========================
// UI UPDATES
// ===========================

function updateAllDisplays() {
    updateInputDashboard();
    updateNeedsDashboard();
    updateIncomeDashboard();
    updateCharts();
}

function updateInputDashboard() {
    // Update summary with formatted currency
    summaryAllowance.textContent = `Rs ${formatCurrency(AppState.monthlyAllowance)}`;

    const totalNeedsAllocated = Object.values(AppState.needs).reduce((sum, week) => sum + week.allocated, 0);
    const totalNeedsSpent = Object.values(AppState.needs).reduce((sum, week) => sum + week.spent, 0);

    summaryNeeds.textContent = `Rs ${formatCurrency(totalNeedsAllocated)}`;
    summarySpent.textContent = `Rs ${formatCurrency(totalNeedsSpent)}`;
    summaryIncome.textContent = `Rs ${formatCurrency(AppState.income.total)}`;
    summarySavings.textContent = `Rs ${formatCurrency(AppState.income.savings.balance)}`;
    summaryPersonal.textContent = `Rs ${formatCurrency(AppState.income.personal.balance)}`;

    // Update recent expenses table
    updateRecentExpenses();
}

function updateRecentExpenses() {
    const tbody = document.querySelector('#recent-expenses tbody');
    tbody.innerHTML = '';

    // Show last 10 expenses
    const recentExpenses = AppState.allExpenses.slice(0, 10);

    recentExpenses.forEach(expense => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(expense.date)}</td>
            <td><span class="badge" data-status="${getExpenseStatus(expense)}">${getCategoryName(expense.category)}</span></td>
            <td>${expense.description}</td>
            <td class="${expense.amount > 0 ? 'text-danger' : ''}">Rs ${formatCurrency(expense.amount)}</td>
            <td><button class="btn-secondary delete-expense" data-id="${expense.id}">Delete</button></td>
        `;
        tbody.appendChild(row);
    });

    // Add delete event listeners
    document.querySelectorAll('.delete-expense').forEach(button => {
        button.addEventListener('click', function() {
            const expenseId = parseInt(this.dataset.id);
            deleteExpense(expenseId);
        });
    });
}

function updateNeedsDashboard() {
    ['fixed_week1', 'week2', 'week3', 'week4'].forEach((weekKey, index) => {
        const weekId = weekKey === 'fixed_week1' ? 'week1' : weekKey;
        const weekData = AppState.needs[weekKey];

        // Update budget display
        document.getElementById(`${weekId}-allocated`).textContent = `Rs ${formatCurrency(weekData.allocated)}`;
        document.getElementById(`${weekId}-spent`).textContent = `Rs ${formatCurrency(weekData.spent)}`;
        document.getElementById(`${weekId}-remaining`).textContent = `Rs ${formatCurrency(weekData.remaining)}`;

        // Update progress bar
        const percentage = weekData.allocated > 0 ? (weekData.spent / weekData.allocated) * 100 : 0;
        document.getElementById(`${weekId}-percentage`).textContent = `${Math.min(100, percentage).toFixed(1)}%`;
        document.getElementById(`${weekId}-progress`).style.width = `${Math.min(100, percentage)}%`;

        // Update status badge
        const badge = document.getElementById(`${weekId}-status`);
        let status = 'on-budget';
        let statusText = 'On Budget';

        if (weekData.remaining < 0) {
            status = 'overspent';
            statusText = 'Overspent';
            document.getElementById(`${weekId}-progress`).style.background = 'linear-gradient(90deg, var(--error-color), #f87171)';
        } else if (percentage < 70) {
            status = 'underspent';
            statusText = 'Underspent';
            document.getElementById(`${weekId}-progress`).style.background = 'linear-gradient(90deg, var(--success-color), #34d399)';
        } else if (percentage >= 90) {
            document.getElementById(`${weekId}-progress`).style.background = 'linear-gradient(90deg, var(--warning-color), #fbbf24)';
        } else {
            document.getElementById(`${weekId}-progress`).style.background = 'var(--primary-gradient)';
        }

        badge.setAttribute('data-status', status);
        badge.textContent = statusText;

        // Update alert message
        const alertElement = document.getElementById(`${weekId}-alert`);
        if (weekData.remaining < 0) {
            alertElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>You overspent by Rs ${formatCurrency(Math.abs(weekData.remaining))}</span>`;
            alertElement.className = 'alert-message danger';
        } else if (percentage < 50) {
            alertElement.innerHTML = `<i class="fas fa-trophy"></i><span>Great! You saved Rs ${formatCurrency(weekData.remaining)} this week</span>`;
            alertElement.className = 'alert-message success';
        } else {
            alertElement.innerHTML = `<i class="fas fa-check-circle"></i><span>You are on budget</span>`;
            alertElement.className = 'alert-message';
        }

        // Update expenses list
        updateWeekExpensesList(weekId, weekData.expenses);
    });
}

function updateWeekExpensesList(weekId, expenses) {
    const container = document.getElementById(`${weekId}-expenses`);
    container.innerHTML = '';

    if (expenses.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No expenses recorded</p>';
        return;
    }

    expenses.slice(-5).forEach(expense => { // Show last 5 expenses
        const item = document.createElement('div');
        item.className = 'expense-item';
        item.innerHTML = `
            <div class="expense-desc">
                <strong>${expense.description}</strong>
                <small class="text-muted">${formatDate(expense.date)}</small>
            </div>
            <div class="expense-amount negative">-Rs ${formatCurrency(expense.amount)}</div>
        `;
        container.appendChild(item);
    });
}

function updateIncomeDashboard() {
    // Update flow diagram
    const flowAllowance = document.getElementById('flow-allowance');
    const flowNeeds = document.getElementById('flow-needs');
    const flowIncome = document.getElementById('flow-income');
    const flowSavings = document.getElementById('flow-savings');
    const flowPersonal = document.getElementById('flow-personal');

    if (flowAllowance) flowAllowance.textContent = `Rs ${formatCurrency(AppState.monthlyAllowance)}`;

    const totalNeedsAllocated = Object.values(AppState.needs).reduce((sum, week) => sum + week.allocated, 0);
    if (flowNeeds) flowNeeds.textContent = `Rs ${formatCurrency(totalNeedsAllocated)}`;

    if (flowIncome) flowIncome.textContent = `Rs ${formatCurrency(AppState.income.total)}`;
    if (flowSavings) flowSavings.textContent = `Rs ${formatCurrency(AppState.income.savings.balance)}`;
    if (flowPersonal) flowPersonal.textContent = `Rs ${formatCurrency(AppState.income.personal.balance)}`;

    // Update savings display
    const savingsBalance = document.getElementById('savings-balance');
    const savingsGrowth = document.getElementById('savings-growth');
    const savingsTotal = document.getElementById('savings-total');

    if (savingsBalance) savingsBalance.textContent = `Rs ${formatCurrency(AppState.income.savings.balance)}`;

    const savingsMonthGrowth = AppState.income.savings.balance;
    if (savingsGrowth) savingsGrowth.textContent = `+Rs ${formatCurrency(savingsMonthGrowth)}`;
    if (savingsTotal) savingsTotal.textContent = `Rs ${formatCurrency(AppState.income.savings.balance)}`;

    // Update savings alert
    const savingsAlert = document.getElementById('savings-alert');
    if (savingsAlert) {
        if (AppState.income.savings.balance > 1000) {
            savingsAlert.innerHTML = `<i class="fas fa-trophy"></i><span>Excellent! You're building great savings habits!</span>`;
            savingsAlert.className = 'alert-message success';
        } else if (AppState.income.savings.balance > 0) {
            savingsAlert.innerHTML = `<i class="fas fa-check-circle"></i><span>Good job! Your savings are growing.</span>`;
            savingsAlert.className = 'alert-message success';
        } else {
            savingsAlert.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>Your savings balance is low. Try to save more!</span>`;
            savingsAlert.className = 'alert-message warning';
        }
    }

    // Update personal spending display
    const personalBalance = document.getElementById('personal-balance');
    const personalSpent = document.getElementById('personal-spent');
    const personalRemaining = document.getElementById('personal-remaining');
    const personalPercentage = document.getElementById('personal-percentage');
    const personalProgress = document.getElementById('personal-progress');

    if (personalBalance) personalBalance.textContent = `Rs ${formatCurrency(AppState.income.personal.balance)}`;
    if (personalSpent) personalSpent.textContent = `Rs ${formatCurrency(AppState.income.personal.spent)}`;
    if (personalRemaining) personalRemaining.textContent = `Rs ${formatCurrency(AppState.income.personal.balance)}`;

    const personalTotal = AppState.income.personal.balance + AppState.income.personal.spent;
    const personalUsagePercentage = personalTotal > 0 ? (AppState.income.personal.spent / personalTotal) * 100 : 0;

    if (personalPercentage) personalPercentage.textContent = `${personalUsagePercentage.toFixed(1)}%`;
    if (personalProgress) personalProgress.style.width = `${Math.min(100, personalUsagePercentage)}%`;

    // Update personal alert
    const personalAlert = document.getElementById('personal-alert');
    if (personalAlert) {
        if (personalUsagePercentage > 80) {
            personalAlert.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>Warning: You've used ${personalUsagePercentage.toFixed(1)}% of your personal budget!</span>`;
            personalAlert.className = 'alert-message danger';
            if (personalProgress) personalProgress.style.background = 'linear-gradient(90deg, var(--error-color), #f87171)';
        } else if (personalUsagePercentage > 50) {
            personalAlert.innerHTML = `<i class="fas fa-info-circle"></i><span>You've used ${personalUsagePercentage.toFixed(1)}% of your personal budget</span>`;
            personalAlert.className = 'alert-message warning';
            if (personalProgress) personalProgress.style.background = 'linear-gradient(90deg, var(--warning-color), #fbbf24)';
        } else {
            personalAlert.innerHTML = `<i class="fas fa-check-circle"></i><span>You're staying within budget</span>`;
            personalAlert.className = 'alert-message';
            if (personalProgress) personalProgress.style.background = 'var(--primary-gradient)';
        }
    }

    // Update expense lists
    updateCategoryExpensesList('savings-expenses', AppState.income.savings.expenses);
    updateCategoryExpensesList('personal-expenses', AppState.income.personal.expenses);

    // Update transactions table
    updateTransactionsTable();
}

function updateMonthDisplay() {
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();

    const monthDisplay = document.getElementById('current-month');
    if (monthDisplay) {
        monthDisplay.textContent = `${currentMonth} ${currentYear}`;
    }

    AppState.currentMonth = `${currentMonth} ${currentYear}`;
}

function updateCategoryExpensesList(containerId, expenses) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (expenses.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No transactions yet</p>';
        return;
    }

    expenses.slice(-5).forEach(expense => {
        const item = document.createElement('div');
        item.className = 'expense-item';
        item.innerHTML = `
            <div class="expense-desc">
                <strong>${expense.description}</strong>
                <small class="text-muted">${formatDate(expense.date)}</small>
            </div>
            <div class="expense-amount negative">-Rs ${formatCurrency(expense.amount)}</div>
        `;
        container.appendChild(item);
    });
}

function updateTransactionsTable() {
    const tbody = document.querySelector('#income-transactions tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Combine all transactions
    const allTransactions = [];

    // Add needs expenses
    Object.keys(AppState.needs).forEach(category => {
        AppState.needs[category].expenses.forEach(expense => {
            allTransactions.push({
                ...expense,
                type: 'Need',
                category: getCategoryName(category),
                balance: AppState.needs[category].remaining
            });
        });
    });

    // Add income expenses
    ['savings', 'personal'].forEach(category => {
        AppState.income[category].expenses.forEach(expense => {
            allTransactions.push({
                ...expense,
                type: category === 'savings' ? 'Savings' : 'Personal',
                category: getCategoryName(category),
                balance: AppState.income[category].balance
            });
        });
    });

    // Sort by date (newest first) and show last 15
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentTransactions = allTransactions.slice(0, 15);

    recentTransactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td><span class="badge ${transaction.type === 'Need' ? 'data-status="underspent"' : ''}">${transaction.type}</span></td>
            <td>${transaction.description}</td>
            <td>${transaction.category}</td>
            <td class="${transaction.amount > 0 ? 'text-danger' : 'text-success'}">${transaction.amount > 0 ? '-' : '+'}Rs ${formatCurrency(Math.abs(transaction.amount))}</td>
            <td>Rs ${formatCurrency(transaction.balance)}</td>
        `;
        tbody.appendChild(row);
    });
}

// ===========================
// CHARTS
// ===========================

function initCharts() {
    // Initialize bar chart for needs
    const barCanvas = document.getElementById('needs-bar-chart');
    if (barCanvas) {
        const barCtx = barCanvas.getContext('2d');
        needsBarChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['Fixed + Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [
                    {
                        label: 'Allocated',
                        data: [0, 0, 0, 0],
                        backgroundColor: 'rgba(94, 58, 238, 0.7)',
                        borderColor: 'rgba(94, 58, 238, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Spent',
                        data: [0, 0, 0, 0],
                        backgroundColor: 'rgba(245, 158, 11, 0.7)',
                        borderColor: 'rgba(245, 158, 11, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.8)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            callback: function(value) {
                                return 'Rs ' + formatCurrency(value);
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    // Initialize pie chart for money flow
    const pieCanvas = document.getElementById('money-pie-chart');
    if (pieCanvas) {
        const pieCtx = pieCanvas.getContext('2d');
        moneyPieChart = new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: ['Needs', 'Savings', 'Personal'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        'rgba(94, 58, 238, 0.8)',
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(155, 89, 182, 0.8)'
                    ],
                    borderColor: [
                        'rgba(94, 58, 238, 1)',
                        'rgba(46, 204, 113, 1)',
                        'rgba(155, 89, 182, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: Rs ${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

function updateCharts() {
    if (needsBarChart) {
        // Update bar chart data
        needsBarChart.data.datasets[0].data = [
            AppState.needs.fixed_week1.allocated,
            AppState.needs.week2.allocated,
            AppState.needs.week3.allocated,
            AppState.needs.week4.allocated
        ];

        needsBarChart.data.datasets[1].data = [
            AppState.needs.fixed_week1.spent,
            AppState.needs.week2.spent,
            AppState.needs.week3.spent,
            AppState.needs.week4.spent
        ];

        needsBarChart.update();
    }

    if (moneyPieChart) {
        // Calculate totals for pie chart
        const totalNeedsSpent = Object.values(AppState.needs).reduce((sum, week) => sum + week.spent, 0);
        const totalSavings = AppState.income.savings.balance + AppState.income.savings.spent;
        const totalPersonal = AppState.income.personal.balance + AppState.income.personal.spent;

        // Update pie chart data
        moneyPieChart.data.datasets[0].data = [
            totalNeedsSpent,
            totalSavings,
            totalPersonal
        ];

        moneyPieChart.update();
    }
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

function formatCurrency(amount) {
    // Format number with 2 decimal places and comma separators
    return parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function getCategoryName(categoryKey) {
    const categoryMap = {
        'fixed_week1': 'Fixed + Week 1',
        'week2': 'Week 2',
        'week3': 'Week 3',
        'week4': 'Week 4',
        'personal': 'Personal',
        'savings': 'Savings'
    };
    return categoryMap[categoryKey] || categoryKey;
}

function getExpenseStatus(expense) {
    if (expense.category === 'personal' || expense.category === 'savings') {
        return 'on-budget';
    }

    const weekData = AppState.needs[expense.category];
    if (!weekData) return 'on-budget';

    if (weekData.remaining < 0) return 'overspent';
    if ((weekData.spent / weekData.allocated) < 0.7) return 'underspent';
    return 'on-budget';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
}

function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
        return;
    }

    // Find and remove expense from all places
    let expenseFound = false;
    let deletedExpense = null;

    // Check needs expenses
    Object.keys(AppState.needs).forEach(category => {
        const index = AppState.needs[category].expenses.findIndex(e => e.id === expenseId);
        if (index > -1) {
            deletedExpense = AppState.needs[category].expenses[index];
            AppState.needs[category].spent = parseFloat((AppState.needs[category].spent - deletedExpense.amount).toFixed(2));
            AppState.needs[category].remaining = parseFloat((AppState.needs[category].remaining + deletedExpense.amount).toFixed(2));
            AppState.needs[category].expenses.splice(index, 1);
            expenseFound = true;
        }
    });

    // Check income expenses
    if (!expenseFound) {
        ['savings', 'personal'].forEach(category => {
            const index = AppState.income[category].expenses.findIndex(e => e.id === expenseId);
            if (index > -1) {
                deletedExpense = AppState.income[category].expenses[index];
                AppState.income[category].spent = parseFloat((AppState.income[category].spent - deletedExpense.amount).toFixed(2));
                AppState.income[category].balance = parseFloat((AppState.income[category].balance + deletedExpense.amount).toFixed(2));
                AppState.income[category].expenses.splice(index, 1);
                expenseFound = true;
            }
        });
    }

    // Remove from all expenses
    if (expenseFound) {
        const allIndex = AppState.allExpenses.findIndex(e => e.id === expenseId);
        if (allIndex > -1) {
            AppState.allExpenses.splice(allIndex, 1);
        }

        // Recalculate income if needs expense was deleted
        if (deletedExpense && (deletedExpense.category.startsWith('week') || deletedExpense.category === 'fixed_week1')) {
            calculateIncome();
        }

        updateAllDisplays();
        saveToLocalStorage();

        showNotification('Expense deleted successfully', 'success');
    }
}

// ===========================
// MONTH MANAGEMENT
// ===========================

function resetMonth() {
    showAlert('Reset Month',
        `Are you sure you want to reset everything for a new month?
        This will clear all expenses but keep your savings balance.`,
        () => {
            // Carry forward savings
            const carrySavings = AppState.income.savings.balance;

            // Reset all state except savings
            const monthlyAllowance = AppState.monthlyAllowance;
            const fixedWeek1Budget = AppState.fixedWeek1Budget;

            // Clear state
            Object.assign(AppState, {
                monthlyAllowance: monthlyAllowance,
                fixedWeek1Budget: fixedWeek1Budget,
                weeks2to4Budget: monthlyAllowance > 0 && fixedWeek1Budget > 0 ?
                    (monthlyAllowance - fixedWeek1Budget) / 3 : 0,

                needs: {
                    fixed_week1: {
                        allocated: fixedWeek1Budget,
                        spent: 0,
                        remaining: fixedWeek1Budget,
                        expenses: []
                    },
                    week2: {
                        allocated: AppState.weeks2to4Budget,
                        spent: 0,
                        remaining: AppState.weeks2to4Budget,
                        expenses: []
                    },
                    week3: {
                        allocated: AppState.weeks2to4Budget,
                        spent: 0,
                        remaining: AppState.weeks2to4Budget,
                        expenses: []
                    },
                    week4: {
                        allocated: AppState.weeks2to4Budget,
                        spent: 0,
                        remaining: AppState.weeks2to4Budget,
                        expenses: []
                    }
                },

                income: {
                    total: 0,
                    savings: {
                        balance: carrySavings,
                        spent: 0,
                        expenses: []
                    },
                    personal: {
                        balance: 0,
                        spent: 0,
                        expenses: []
                    }
                },

                allExpenses: [],
                currentMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                lastResetDate: new Date().toISOString().split('T')[0]
            });

            // Update month display to current month
            updateMonthDisplay();

            // Update UI
            updateAllDisplays();
            saveToLocalStorage();

            // Update month display
            document.getElementById('current-month').textContent = AppState.currentMonth;

            showNotification('Month reset successfully! Savings carried forward.', 'success');
        }
    );
}

// ===========================
// NOTIFICATION SYSTEM
// ===========================

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'danger' ? 'times-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    container.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeOut 0.5s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }
    }, 5000);
}

function showAlert(title, message, onConfirm = null) {
    const modal = document.getElementById('alert-modal');
    const titleElement = document.getElementById('modal-title');
    const messageElement = document.getElementById('modal-message');
    const confirmButton = document.getElementById('modal-confirm');

    if (!modal || !titleElement || !messageElement || !confirmButton) return;

    titleElement.textContent = title;
    messageElement.textContent = message;

    modal.classList.add('active');

    const closeHandler = () => {
        if (onConfirm) onConfirm();
        closeModal();
    };

    // Remove old listeners
    confirmButton.replaceWith(confirmButton.cloneNode(true));
    const newConfirmButton = document.getElementById('modal-confirm');

    newConfirmButton.addEventListener('click', closeHandler);
}

function closeModal() {
    const modal = document.getElementById('alert-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ===========================
// LOCAL STORAGE
// ===========================

function saveToLocalStorage() {
    try {
        const data = {
            state: AppState,
            version: '2.0',
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('waseth-budget-app', JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        showNotification('Failed to save data. Please check your browser storage.', 'danger');
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('waseth-budget-app');
        if (saved) {
            const data = JSON.parse(saved);

            // Migrate from old version if needed
            if (data.version === '1.0') {
                // Convert old integer values to decimal
                migrateFromVersion1(data.state);
            }

            // Check if data is from today, otherwise reset
            const today = new Date().toISOString().split('T')[0];
            if (data.state.lastResetDate === today) {
                Object.assign(AppState, data.state);
            }
        }

        // Load theme preference
        const savedTheme = localStorage.getItem('budget-theme');
        if (savedTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            const icon = document.querySelector('#theme-toggle i');
            if (icon) icon.className = 'fas fa-sun';
        }
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        showNotification('Failed to load saved data. Starting fresh.', 'warning');
    }
}

function migrateFromVersion1(oldState) {
    // Convert integer values to decimal
    if (oldState.monthlyAllowance) oldState.monthlyAllowance = parseFloat(oldState.monthlyAllowance);
    if (oldState.fixedWeek1Budget) oldState.fixedWeek1Budget = parseFloat(oldState.fixedWeek1Budget);
    if (oldState.weeks2to4Budget) oldState.weeks2to4Budget = parseFloat(oldState.weeks2to4Budget);

    // Convert needs values
    Object.keys(oldState.needs).forEach(key => {
        oldState.needs[key].allocated = parseFloat(oldState.needs[key].allocated || 0);
        oldState.needs[key].spent = parseFloat(oldState.needs[key].spent || 0);
        oldState.needs[key].remaining = parseFloat(oldState.needs[key].remaining || 0);

        // Convert expense amounts
        oldState.needs[key].expenses.forEach(expense => {
            expense.amount = parseFloat(expense.amount || 0);
        });
    });

    // Convert income values
    oldState.income.total = parseFloat(oldState.income.total || 0);
    oldState.income.savings.balance = parseFloat(oldState.income.savings.balance || 0);
    oldState.income.savings.spent = parseFloat(oldState.income.savings.spent || 0);
    oldState.income.personal.balance = parseFloat(oldState.income.personal.balance || 0);
    oldState.income.personal.spent = parseFloat(oldState.income.personal.spent || 0);

    // Convert all expenses
    oldState.allExpenses.forEach(expense => {
        expense.amount = parseFloat(expense.amount || 0);
    });
}

// ===========================
// INITIALIZE APP
// ===========================

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', initApp);