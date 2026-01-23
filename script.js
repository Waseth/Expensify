const AppState = {
    monthlyAllowance: 0,
    fixedWeek1Budget: 0,
    weeks2to4Budget: 0,

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

    allExpenses: [],
    currentMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    lastResetDate: new Date().toISOString().split('T')[0]
};

const navButtons = document.querySelectorAll('.nav-btn');
const dashboards = document.querySelectorAll('.dashboard');
const monthlyAllowanceInput = document.getElementById('monthly-allowance');
const fixedWeek1BudgetInput = document.getElementById('fixed-week1-budget');
const weeks2to4BudgetDisplay = document.getElementById('weeks2-4-budget');
const updateBudgetButton = document.getElementById('update-budget');
const expenseForm = document.getElementById('expense-form');
const expenseCategorySelect = document.getElementById('expense-category');
const expenseDescriptionInput = document.getElementById('expense-description');
const expenseAmountInput = document.getElementById('expense-amount');
const expenseDateInput = document.getElementById('expense-date');
const summaryAllowance = document.getElementById('summary-allowance');
const summaryNeeds = document.getElementById('summary-needs');
const summarySpent = document.getElementById('summary-spent');
const summaryIncome = document.getElementById('summary-income');
const summarySavings = document.getElementById('summary-savings');
const summaryPersonal = document.getElementById('summary-personal');

let needsBarChart = null;
let moneyPieChart = null;

function initApp() {
    expenseDateInput.valueAsDate = new Date();
    monthlyAllowanceInput.step = '0.01';
    fixedWeek1BudgetInput.step = '0.01';
    expenseAmountInput.step = '0.01';
    updateMonthDisplay();
    loadFromLocalStorage();
    setupEventListeners();
    initCharts();
    updateAllDisplays();
    showWelcomeNotification();
}

function setupEventListeners() {
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const dashboardId = button.dataset.dashboard;
            switchDashboard(dashboardId);
        });
    });

    updateBudgetButton.addEventListener('click', updateBudget);
    expenseForm.addEventListener('submit', addExpense);
    monthlyAllowanceInput.addEventListener('input', calculateWeeksBudget);
    fixedWeek1BudgetInput.addEventListener('input', calculateWeeksBudget);
    document.getElementById('reset-month').addEventListener('click', resetMonth);
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-confirm').addEventListener('click', closeModal);
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

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? null : 'light';
    const icon = document.querySelector('#theme-toggle i');

    if (newTheme) {
        document.documentElement.setAttribute('data-theme', newTheme);
        icon.className = 'fas fa-sun';
        localStorage.setItem('budget-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
        icon.className = 'fas fa-moon';
        localStorage.setItem('budget-theme', 'dark');
    }
}

function switchDashboard(dashboardId) {
    navButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.dashboard === dashboardId);
    });
    dashboards.forEach(dashboard => {
        dashboard.classList.toggle('active', dashboard.id === `${dashboardId}-dashboard`);
    });
    if (dashboardId === 'needs') {
        updateNeedsDashboard();
    } else if (dashboardId === 'income') {
        updateIncomeDashboard();
    }
}

function calculateWeeksBudget() {
    const allowance = parseFloat(monthlyAllowanceInput.value) || 0;
    const week1Budget = parseFloat(fixedWeek1BudgetInput.value) || 0;

    if (allowance >= week1Budget && week1Budget > 0) {
        const remaining = allowance - week1Budget;
        const weeklyBudget = remaining / 3;
        weeks2to4BudgetDisplay.textContent = `Ksh ${formatCurrency(weeklyBudget)}`;
    } else {
        weeks2to4BudgetDisplay.textContent = 'Ksh 0';
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

    AppState.monthlyAllowance = allowance;
    AppState.fixedWeek1Budget = week1Budget;

    const remaining = allowance - week1Budget;
    AppState.weeks2to4Budget = remaining / 3;

    AppState.needs.fixed_week1.allocated = week1Budget;
    AppState.needs.fixed_week1.remaining = week1Budget;

    for (let i = 2; i <= 4; i++) {
        const weekKey = `week${i}`;
        AppState.needs[weekKey].allocated = AppState.weeks2to4Budget;
        AppState.needs[weekKey].remaining = AppState.weeks2to4Budget;
    }
    calculateIncome();
    updateAllDisplays();
    saveToLocalStorage();
    // Only show success notification if there was a significant change
    if (allowance > 0 || week1Budget > 0) {
        showNotification('Budget updated!', 'success');
    }
}

function addExpense(e) {
    e.preventDefault();

    const amount = parseFloat(expenseAmountInput.value);
    const category = expenseCategorySelect.value;
    const description = expenseDescriptionInput.value.trim();
    const date = expenseDateInput.value;

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

    const expense = {
        id: Date.now(),
        amount: parseFloat(amount.toFixed(2)),
        category: category,
        description: description,
        date: date,
        timestamp: new Date().toISOString()
    };

    if (category.startsWith('week') || category === 'fixed_week1') {
        if (AppState.needs[category].remaining < amount) {
            const overspendAmount = (amount - AppState.needs[category].remaining).toFixed(2);
            if (!confirm(`This will overspend your ${getCategoryName(category)} budget by Ksh ${formatCurrency(overspendAmount)}. Continue?`)) {
                return;
            }
        }

        AppState.needs[category].spent = parseFloat((AppState.needs[category].spent + amount).toFixed(2));
        AppState.needs[category].remaining = parseFloat((AppState.needs[category].remaining - amount).toFixed(2));
        AppState.needs[category].expenses.push(expense);

        // Only show overspend notification for significant amounts (>100)
        if (AppState.needs[category].remaining < -100) {
            showNotification(`Overspent ${getCategoryName(category)} budget by Ksh ${formatCurrency(Math.abs(AppState.needs[category].remaining))}`, 'warning');
        }

    } else {
        if (AppState.income[category].balance < amount) {
            showAlert('Insufficient Funds', `You don't have enough balance in ${getCategoryName(category)}. Current balance: Ksh ${formatCurrency(AppState.income[category].balance)}`);
            return;
        }

        AppState.income[category].spent = parseFloat((AppState.income[category].spent + amount).toFixed(2));
        AppState.income[category].balance = parseFloat((AppState.income[category].balance - amount).toFixed(2));
        AppState.income[category].expenses.push(expense);
    }

    AppState.allExpenses.unshift(expense);

    if (category.startsWith('week') || category === 'fixed_week1') {
        calculateIncome();
    }
    updateAllDisplays();
    saveToLocalStorage();
    expenseForm.reset();
    expenseDateInput.valueAsDate = new Date();
}

function calculateIncome() {
    let totalNeedsSpent = 0;
    let totalNeedsAllocated = 0;

    Object.keys(AppState.needs).forEach(key => {
        totalNeedsSpent += AppState.needs[key].spent;
        totalNeedsAllocated += AppState.needs[key].allocated;
    });

    const needsDifference = parseFloat((totalNeedsAllocated - totalNeedsSpent).toFixed(2));
    AppState.income.total = needsDifference;
    const halfIncome = parseFloat((AppState.income.total / 2).toFixed(2));

    if (halfIncome > 0) {
        AppState.income.savings.balance = parseFloat((AppState.income.savings.balance + halfIncome).toFixed(2));
        AppState.income.personal.balance = parseFloat((AppState.income.personal.balance + halfIncome).toFixed(2));
    } else if (halfIncome < 0) {
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

function updateAllDisplays() {
    updateInputDashboard();
    updateNeedsDashboard();
    updateIncomeDashboard();
    updateCharts();
}

function updateInputDashboard() {
    summaryAllowance.textContent = `Ksh ${formatCurrency(AppState.monthlyAllowance)}`;

    const totalNeedsAllocated = Object.values(AppState.needs).reduce((sum, week) => sum + week.allocated, 0);
    const totalNeedsSpent = Object.values(AppState.needs).reduce((sum, week) => sum + week.spent, 0);

    summaryNeeds.textContent = `Ksh ${formatCurrency(totalNeedsAllocated)}`;
    summarySpent.textContent = `Ksh ${formatCurrency(totalNeedsSpent)}`;
    summaryIncome.textContent = `Ksh ${formatCurrency(AppState.income.total)}`;
    summarySavings.textContent = `Ksh ${formatCurrency(AppState.income.savings.balance)}`;
    summaryPersonal.textContent = `Ksh ${formatCurrency(AppState.income.personal.balance)}`;
    updateRecentExpenses();
}

function updateRecentExpenses() {
    const tbody = document.querySelector('#recent-expenses tbody');
    tbody.innerHTML = '';
    const recentExpenses = AppState.allExpenses.slice(0, 10);
    recentExpenses.forEach(expense => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(expense.date)}</td>
            <td><span class="badge" data-status="${getExpenseStatus(expense)}">${getCategoryName(expense.category)}</span></td>
            <td>${expense.description}</td>
            <td class="${expense.amount > 0 ? 'text-danger' : ''}">Ksh ${formatCurrency(expense.amount)}</td>
            <td><button class="btn-secondary delete-expense" data-id="${expense.id}">Delete</button></td>
        `;
        tbody.appendChild(row);
    });

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

        document.getElementById(`${weekId}-allocated`).textContent = `Ksh ${formatCurrency(weekData.allocated)}`;
        document.getElementById(`${weekId}-spent`).textContent = `Ksh ${formatCurrency(weekData.spent)}`;
        document.getElementById(`${weekId}-remaining`).textContent = `Ksh ${formatCurrency(weekData.remaining)}`;

        const percentage = weekData.allocated > 0 ? (weekData.spent / weekData.allocated) * 100 : 0;
        document.getElementById(`${weekId}-percentage`).textContent = `${Math.min(100, percentage).toFixed(1)}%`;
        document.getElementById(`${weekId}-progress`).style.width = `${Math.min(100, percentage)}%`;

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

        // Update alert messages only when necessary
        const alertElement = document.getElementById(`${weekId}-alert`);
        if (weekData.remaining < 0) {
            // Only show if overspent by more than 100
            if (Math.abs(weekData.remaining) > 100) {
                alertElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>Overspent by Ksh ${formatCurrency(Math.abs(weekData.remaining))}</span>`;
                alertElement.className = 'alert-message danger';
                alertElement.style.display = 'flex';
            } else {
                alertElement.style.display = 'none';
            }
        } else if (percentage < 50 && weekData.remaining > 1000) {
            // Only show "saved" message if remaining is significant
            alertElement.innerHTML = `<i class="fas fa-trophy"></i><span>Saved Ksh ${formatCurrency(weekData.remaining)} this week</span>`;
            alertElement.className = 'alert-message success';
            alertElement.style.display = 'flex';
        } else if (percentage >= 90) {
            // Only show warning if close to budget limit
            alertElement.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>Approaching budget limit</span>`;
            alertElement.className = 'alert-message warning';
            alertElement.style.display = 'flex';
        } else {
            // Hide the alert element when no special condition is met
            alertElement.style.display = 'none';
        }

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

    expenses.slice(-5).forEach(expense => {
        const item = document.createElement('div');
        item.className = 'expense-item';
        item.innerHTML = `
            <div class="expense-desc">
                <strong>${expense.description}</strong>
                <small class="text-muted">${formatDate(expense.date)}</small>
            </div>
            <div class="expense-amount negative">-Ksh ${formatCurrency(expense.amount)}</div>
        `;
        container.appendChild(item);
    });
}

function updateIncomeDashboard() {
    const flowAllowance = document.getElementById('flow-allowance');
    const flowNeeds = document.getElementById('flow-needs');
    const flowIncome = document.getElementById('flow-income');
    const flowSavings = document.getElementById('flow-savings');
    const flowPersonal = document.getElementById('flow-personal');

    if (flowAllowance) flowAllowance.textContent = `Ksh ${formatCurrency(AppState.monthlyAllowance)}`;

    const totalNeedsAllocated = Object.values(AppState.needs).reduce((sum, week) => sum + week.allocated, 0);
    if (flowNeeds) flowNeeds.textContent = `Ksh ${formatCurrency(totalNeedsAllocated)}`;

    if (flowIncome) flowIncome.textContent = `Ksh ${formatCurrency(AppState.income.total)}`;
    if (flowSavings) flowSavings.textContent = `Ksh ${formatCurrency(AppState.income.savings.balance)}`;
    if (flowPersonal) flowPersonal.textContent = `Ksh ${formatCurrency(AppState.income.personal.balance)}`;

    const savingsBalance = document.getElementById('savings-balance');
    const savingsGrowth = document.getElementById('savings-growth');
    const savingsTotal = document.getElementById('savings-total');

    if (savingsBalance) savingsBalance.textContent = `Ksh ${formatCurrency(AppState.income.savings.balance)}`;

    const savingsMonthGrowth = AppState.income.savings.balance;
    if (savingsGrowth) savingsGrowth.textContent = `+Ksh ${formatCurrency(savingsMonthGrowth)}`;
    if (savingsTotal) savingsTotal.textContent = `Ksh ${formatCurrency(AppState.income.savings.balance)}`;

    // Update savings alert - only show when balance is very low or very high
    const savingsAlert = document.getElementById('savings-alert');
    if (savingsAlert) {
        if (AppState.income.savings.balance <= 0) {
            savingsAlert.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>Savings balance is empty</span>`;
            savingsAlert.className = 'alert-message warning';
            savingsAlert.style.display = 'flex';
        } else if (AppState.income.savings.balance > 5000) {
            savingsAlert.innerHTML = `<i class="fas fa-trophy"></i><span>Great savings progress!</span>`;
            savingsAlert.className = 'alert-message success';
            savingsAlert.style.display = 'flex';
        } else {
            savingsAlert.style.display = 'none';
        }
    }

    const personalBalance = document.getElementById('personal-balance');
    const personalSpent = document.getElementById('personal-spent');
    const personalRemaining = document.getElementById('personal-remaining');
    const personalPercentage = document.getElementById('personal-percentage');
    const personalProgress = document.getElementById('personal-progress');

    if (personalBalance) personalBalance.textContent = `Ksh ${formatCurrency(AppState.income.personal.balance)}`;
    if (personalSpent) personalSpent.textContent = `Ksh ${formatCurrency(AppState.income.personal.spent)}`;
    if (personalRemaining) personalRemaining.textContent = `Ksh ${formatCurrency(AppState.income.personal.balance)}`;

    const personalTotal = AppState.income.personal.balance + AppState.income.personal.spent;
    const personalUsagePercentage = personalTotal > 0 ? (AppState.income.personal.spent / personalTotal) * 100 : 0;

    if (personalPercentage) personalPercentage.textContent = `${personalUsagePercentage.toFixed(1)}%`;
    if (personalProgress) personalProgress.style.width = `${Math.min(100, personalUsagePercentage)}%`;

    // Update personal alert - only show warnings when necessary
    const personalAlert = document.getElementById('personal-alert');
    if (personalAlert) {
        if (personalUsagePercentage > 95) {
            personalAlert.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>Personal budget almost depleted!</span>`;
            personalAlert.className = 'alert-message danger';
            personalAlert.style.display = 'flex';
            if (personalProgress) personalProgress.style.background = 'linear-gradient(90deg, var(--error-color), #f87171)';
        } else if (personalUsagePercentage > 80 && AppState.income.personal.balance < 500) {
            personalAlert.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>Low personal budget remaining</span>`;
            personalAlert.className = 'alert-message warning';
            personalAlert.style.display = 'flex';
            if (personalProgress) personalProgress.style.background = 'linear-gradient(90deg, var(--warning-color), #fbbf24)';
        } else {
            personalAlert.style.display = 'none';
            if (personalProgress) personalProgress.style.background = 'var(--primary-gradient)';
        }
    }

    updateCategoryExpensesList('savings-expenses', AppState.income.savings.expenses);
    updateCategoryExpensesList('personal-expenses', AppState.income.personal.expenses);
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
            <div class="expense-amount negative">-Ksh ${formatCurrency(expense.amount)}</div>
        `;
        container.appendChild(item);
    });
}

function updateTransactionsTable() {
    const tbody = document.querySelector('#income-transactions tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const allTransactions = [];

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

    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentTransactions = allTransactions.slice(0, 15);

    recentTransactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td><span class="badge ${transaction.type === 'Need' ? 'data-status="underspent"' : ''}">${transaction.type}</span></td>
            <td>${transaction.description}</td>
            <td>${transaction.category}</td>
            <td class="${transaction.amount > 0 ? 'text-danger' : 'text-success'}">${transaction.amount > 0 ? '-' : '+'}Ksh ${formatCurrency(Math.abs(transaction.amount))}</td>
            <td>Ksh ${formatCurrency(transaction.balance)}</td>
        `;
        tbody.appendChild(row);
    });
}

function initCharts() {
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
                                return 'Ksh ' + formatCurrency(value);
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
                                return `${label}: Ksh ${formatCurrency(value)} (${percentage}%)`;
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
        const totalNeedsSpent = Object.values(AppState.needs).reduce((sum, week) => sum + week.spent, 0);
        const totalSavings = AppState.income.savings.balance + AppState.income.savings.spent;
        const totalPersonal = AppState.income.personal.balance + AppState.income.personal.spent;

        moneyPieChart.data.datasets[0].data = [
            totalNeedsSpent,
            totalSavings,
            totalPersonal
        ];

        moneyPieChart.update();
    }
}

function formatCurrency(amount) {
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

    let expenseFound = false;
    let deletedExpense = null;

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
    if (expenseFound) {
        const allIndex = AppState.allExpenses.findIndex(e => e.id === expenseId);
        if (allIndex > -1) {
            AppState.allExpenses.splice(allIndex, 1);
        }

        if (deletedExpense && (deletedExpense.category.startsWith('week') || deletedExpense.category === 'fixed_week1')) {
            calculateIncome();
        }

        updateAllDisplays();
        saveToLocalStorage();
        // No success notification for deletion
    }
}

function resetMonth() {
    showAlert('Reset Month',
        `Are you sure you want to reset everything for a new month?
        This will clear all expenses but keep your savings balance.`,
        () => {
            const carrySavings = AppState.income.savings.balance;
            const monthlyAllowance = AppState.monthlyAllowance;
            const fixedWeek1Budget = AppState.fixedWeek1Budget;

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
            updateMonthDisplay();
            updateAllDisplays();
            saveToLocalStorage();
            document.getElementById('current-month').textContent = AppState.currentMonth;
        }
    );
}

function showWelcomeNotification() {
    // Only show welcome notification if it's the first time or after a long time
    const lastVisit = localStorage.getItem('last-visit');
    const now = new Date().getTime();

    if (!lastVisit || (now - parseInt(lastVisit)) > 24 * 60 * 60 * 1000) {
        showNotification('Welcome to Expensify!', 'success');
        localStorage.setItem('last-visit', now.toString());
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    // Don't show success notifications for minor actions
    if (type === 'success' && (message.includes('added') || message.includes('deleted'))) {
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'danger' ? 'times-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    container.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeOut 0.5s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }
    }, 3000); // Shorter duration for notifications
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
        // Don't show notification for storage errors unless it's critical
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('waseth-budget-app');
        if (saved) {
            const data = JSON.parse(saved);

            if (data.version === '1.0') {
                migrateFromVersion1(data.state);
            }

            const today = new Date().toISOString().split('T')[0];
            if (data.state.lastResetDate === today) {
                Object.assign(AppState, data.state);
            }
        }

        const savedTheme = localStorage.getItem('budget-theme');
        if (savedTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            const icon = document.querySelector('#theme-toggle i');
            if (icon) icon.className = 'fas fa-sun';
        }
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        // Don't show notification for load errors
    }
}

function migrateFromVersion1(oldState) {
    if (oldState.monthlyAllowance) oldState.monthlyAllowance = parseFloat(oldState.monthlyAllowance);
    if (oldState.fixedWeek1Budget) oldState.fixedWeek1Budget = parseFloat(oldState.fixedWeek1Budget);
    if (oldState.weeks2to4Budget) oldState.weeks2to4Budget = parseFloat(oldState.weeks2to4Budget);

    Object.keys(oldState.needs).forEach(key => {
        oldState.needs[key].allocated = parseFloat(oldState.needs[key].allocated || 0);
        oldState.needs[key].spent = parseFloat(oldState.needs[key].spent || 0);
        oldState.needs[key].remaining = parseFloat(oldState.needs[key].remaining || 0);

        oldState.needs[key].expenses.forEach(expense => {
            expense.amount = parseFloat(expense.amount || 0);
        });
    });

    oldState.income.total = parseFloat(oldState.income.total || 0);
    oldState.income.savings.balance = parseFloat(oldState.income.savings.balance || 0);
    oldState.income.savings.spent = parseFloat(oldState.income.savings.spent || 0);
    oldState.income.personal.balance = parseFloat(oldState.income.personal.balance || 0);
    oldState.income.personal.spent = parseFloat(oldState.income.personal.spent || 0);

    oldState.allExpenses.forEach(expense => {
        expense.amount = parseFloat(expense.amount || 0);
    });
}

document.addEventListener('DOMContentLoaded', initApp);