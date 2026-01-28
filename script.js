const AppState = {
    monthlyAllowance: 0,
    fixedWeek1Budget: 0,
    weeks2to4Budget: 0,
    budgetLocked: false,
    currentWeek: 'fixed_week1',
    monthStartDate: null,

    needs: {
        fixed_week1: { allocated: 0, spent: 0, remaining: 0, expenses: [], ended: false },
        week2: { allocated: 0, spent: 0, remaining: 0, expenses: [], ended: false },
        week3: { allocated: 0, spent: 0, remaining: 0, expenses: [], ended: false },
        week4: { allocated: 0, spent: 0, remaining: 0, expenses: [], ended: false }
    },

    income: {
        externalIncome: 0,
        savings: { balance: 0, spent: 0, expenses: [] },
        personal: { balance: 0, spent: 0, expenses: [] }
    },

    allExpenses: [],
    externalIncomeHistory: []
};

let needsBarChart = null;
let moneyPieChart = null;
let currentWeekToEnd = null;
let expenseToDelete = null;

function initApp() {

     const savedTheme = localStorage.getItem('budget-theme');
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    document.getElementById('expense-date').valueAsDate = new Date();

    setMonthStartDate();
    loadFromStorage();
    setupEventListeners();
    initCharts();
    updateAllDisplays();
    checkWeekProgress();
    setupThemeToggler();
}

function setupEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchDashboard(btn.dataset.dashboard);
            // Close mobile menu after selection
            if (window.innerWidth <= 768) {
                document.getElementById('nav-links').classList.remove('active');
                document.getElementById('nav-toggle').classList.remove('active');
            }
        });
    });

    // Mobile nav toggle
    document.getElementById('nav-toggle').addEventListener('click', () => {
        const navLinks = document.getElementById('nav-links');
        const navToggle = document.getElementById('nav-toggle');

        navLinks.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

    document.getElementById('update-budget').addEventListener('click', updateBudget);
    document.getElementById('expense-form').addEventListener('submit', addExpense);
    document.getElementById('monthly-allowance').addEventListener('input', calculateWeeksBudget);
    document.getElementById('fixed-week1-budget').addEventListener('input', calculateWeeksBudget);
    document.getElementById('reset-month').addEventListener('click', resetMonth);
    document.getElementById('clear-all-data').addEventListener('click', openClearAllDataModal);
    document.getElementById('add-external-income').addEventListener('click', openExternalIncomeModal);
    document.getElementById('external-income-submit').addEventListener('click', addExternalIncome);
    document.getElementById('external-income-cancel').addEventListener('click', closeExternalIncomeModal);

    document.querySelectorAll('.end-week-btn').forEach(btn => {
        btn.addEventListener('click', () => openEndWeekModal(btn.dataset.week));
    });

    document.getElementById('end-week-confirm').addEventListener('click', confirmEndWeek);
    document.getElementById('end-week-cancel').addEventListener('click', closeEndWeekModal);

    document.getElementById('delete-expense-confirm').addEventListener('click', confirmDeleteExpense);
    document.getElementById('delete-expense-cancel').addEventListener('click', closeDeleteExpenseModal);

    document.getElementById('clear-all-data-confirm').addEventListener('click', confirmClearAllData);
    document.getElementById('clear-all-data-cancel').addEventListener('click', closeClearAllDataModal);

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            closeExternalIncomeModal();
            closeModal();
            closeEndWeekModal();
            closeDeleteExpenseModal();
            closeClearAllDataModal();
        });
    });

    document.getElementById('modal-confirm').addEventListener('click', closeModal);
}

function setupThemeToggler() {
    const toggler = document.createElement('div');
    toggler.className = 'theme-toggler';
    toggler.innerHTML = `<button class="theme-toggle-btn" id="theme-toggle"><i class="fas fa-moon"></i></button>`;
    document.body.appendChild(toggler);

    // Set correct icon based on current theme
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const icon = document.querySelector('#theme-toggle i');
    if (currentTheme === 'light') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? null : 'light';
    const icon = document.querySelector('#theme-toggle i');

    // Add rotation animation to button
    const button = document.getElementById('theme-toggle');
    button.style.transform = 'rotate(360deg)';
    setTimeout(() => {
        button.style.transform = '';
    }, 500);

    // Fade out icon
    icon.style.opacity = '0';
    icon.style.transform = 'rotate(180deg) scale(0.5)';

    setTimeout(() => {
        if (newTheme) {
            document.documentElement.setAttribute('data-theme', newTheme);
            icon.className = 'fas fa-sun';
            localStorage.setItem('budget-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
            icon.className = 'fas fa-moon';
            localStorage.setItem('budget-theme', 'dark');
        }

        updateChartColors();

        // Fade in new icon
        setTimeout(() => {
            icon.style.opacity = '1';
            icon.style.transform = 'rotate(0deg) scale(1)';
        }, 50);
    }, 150);


}

function setMonthStartDate() {
    const now = new Date();
    AppState.monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
}

function switchDashboard(dashboardId) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.dashboard === dashboardId);
    });
    document.querySelectorAll('.dashboard').forEach(dashboard => {
        dashboard.classList.toggle('active', dashboard.id === `${dashboardId}-dashboard`);
    });
    if (dashboardId === 'needs') updateNeedsDashboard();
    if (dashboardId === 'income') updateIncomeDashboard();
}

function calculateWeeksBudget() {
    const allowance = parseFloat(document.getElementById('monthly-allowance').value) || 0;
    const week1Budget = parseFloat(document.getElementById('fixed-week1-budget').value) || 0;

    if (allowance >= week1Budget && week1Budget > 0) {
        const remaining = allowance - week1Budget;
        const weeklyBudgetRaw = remaining / 3;
        const weeklyBudget = Math.floor(weeklyBudgetRaw / 10) * 10; // Round down to nearest 10
        const leftover = remaining - (weeklyBudget * 3); // Calculate leftover amount

        document.getElementById('weeks2-4-budget').textContent = `Ksh ${formatCurrency(weeklyBudget)}`;

        // Show leftover info if there is any
        const leftoverInfo = document.getElementById('leftover-info');
        if (leftover > 0) {
            leftoverInfo.textContent = `Ksh ${formatCurrency(leftover)} will be added to Savings`;
            leftoverInfo.style.display = 'block';
        } else {
            leftoverInfo.style.display = 'none';
        }
    } else {
        document.getElementById('weeks2-4-budget').textContent = 'Ksh 0';
        document.getElementById('leftover-info').style.display = 'none';
    }
}

function updateBudget() {
    const allowance = parseFloat(document.getElementById('monthly-allowance').value);
    const week1Budget = parseFloat(document.getElementById('fixed-week1-budget').value);

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
    const weeklyBudgetRaw = remaining / 3;
    const weeklyBudget = Math.floor(weeklyBudgetRaw / 10) * 10; // Round down to nearest 10
    const leftover = parseFloat((remaining - (weeklyBudget * 3)).toFixed(2)); // Calculate leftover amount

    AppState.weeks2to4Budget = weeklyBudget;

    AppState.needs.fixed_week1.allocated = week1Budget;
    AppState.needs.fixed_week1.remaining = week1Budget;

    ['week2', 'week3', 'week4'].forEach(week => {
        AppState.needs[week].allocated = weeklyBudget;
        AppState.needs[week].remaining = weeklyBudget;
    });

    // Add leftover to savings
    if (leftover > 0) {
        AppState.income.savings.balance = parseFloat((AppState.income.savings.balance + leftover).toFixed(2));
    }

    // Lock the input fields
    AppState.budgetLocked = true;
    document.getElementById('monthly-allowance').disabled = true;
    document.getElementById('fixed-week1-budget').disabled = true;
    document.getElementById('update-budget').disabled = true;

    updateAllDisplays();
    saveToStorage();

    // Show notification with leftover info
    if (leftover > 0) {
        showNotification(`Budget plan updated! Ksh ${formatCurrency(leftover)} leftover added to Savings.`, 'success');
    } else {
        showNotification('Budget plan updated and locked!', 'success');
    }
}

function addExpense(e) {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const description = document.getElementById('expense-description').value.trim();
    const date = document.getElementById('expense-date').value;

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

    const expense = {
        id: Date.now(),
        amount: parseFloat(amount.toFixed(2)),
        category: category,
        description: description,
        date: date,
        timestamp: new Date().toISOString()
    };

    // Handle needs categories (expenses reduce allocated amount immediately)
    if (category.startsWith('week') || category === 'fixed_week1') {
        if (AppState.needs[category].ended) {
            showAlert('Week Ended', 'This week has already been ended. You cannot add expenses to it.');
            return;
        }

        AppState.needs[category].spent = parseFloat((AppState.needs[category].spent + amount).toFixed(2));
        AppState.needs[category].remaining = parseFloat((AppState.needs[category].remaining - amount).toFixed(2));
        AppState.needs[category].expenses.push(expense);
    }
    // Handle income categories (personal & savings)
    else {
        if (AppState.income[category].balance < amount) {
            showAlert('Insufficient Funds', `You don't have enough balance in ${getCategoryName(category)}. Current balance: Ksh ${formatCurrency(AppState.income[category].balance)}`);
            return;
        }

        AppState.income[category].spent = parseFloat((AppState.income[category].spent + amount).toFixed(2));
        AppState.income[category].balance = parseFloat((AppState.income[category].balance - amount).toFixed(2));
        AppState.income[category].expenses.push(expense);
    }

    AppState.allExpenses.unshift(expense);
    updateAllDisplays();
    saveToStorage();

    document.getElementById('expense-form').reset();
    document.getElementById('expense-date').valueAsDate = new Date();
    showNotification('Expense added successfully!', 'success');
}

function openEndWeekModal(weekKey) {
    if (AppState.needs[weekKey].ended) {
        showAlert('Week Already Ended', 'This week has already been ended.');
        return;
    }

    currentWeekToEnd = weekKey;
    const weekName = getCategoryName(weekKey);
    const allocated = AppState.needs[weekKey].allocated;
    const spent = AppState.needs[weekKey].spent;
    const surplus = parseFloat((allocated - spent).toFixed(2));

    document.getElementById('end-week-name').textContent = weekName;
    document.getElementById('end-week-allocated').textContent = `Ksh ${formatCurrency(allocated)}`;
    document.getElementById('end-week-spent').textContent = `Ksh ${formatCurrency(spent)}`;
    document.getElementById('end-week-result').textContent = `Ksh ${formatCurrency(Math.abs(surplus))}`;

    const resultLabel = document.getElementById('end-week-result-label');
    const resultValue = document.getElementById('end-week-result');
    const infoBox = document.getElementById('end-week-info');
    const infoText = document.getElementById('end-week-info-text');
    const warningBox = document.getElementById('end-week-warning');

    if (surplus > 0) {
        resultLabel.textContent = 'Surplus:';
        resultValue.className = 'summary-value positive';
        infoText.textContent = `This surplus will be split 50/50 between Savings and Personal balance. Each will receive Ksh ${formatCurrency(surplus / 2)}.`;
        infoBox.style.display = 'flex';
    } else if (surplus < 0) {
        resultLabel.textContent = 'Deficit:';
        resultValue.className = 'summary-value negative';
        const deficit = Math.abs(surplus);
        const personalBalance = AppState.income.personal.balance;

        if (personalBalance >= deficit) {
            infoText.textContent = `This deficit of Ksh ${formatCurrency(deficit)} will be deducted from your Personal balance.`;
        } else if (personalBalance > 0) {
            const remainingDeficit = deficit - personalBalance;
            infoText.textContent = `Personal balance (Ksh ${formatCurrency(personalBalance)}) will cover part of the deficit. The remaining Ksh ${formatCurrency(remainingDeficit)} will be deducted from Savings.`;
        } else {
            infoText.textContent = `Personal balance is zero. The entire deficit of Ksh ${formatCurrency(deficit)} will be deducted from Savings.`;
        }
        infoBox.style.display = 'flex';
    } else {
        resultLabel.textContent = 'Result:';
        resultValue.className = 'summary-value';
        infoText.textContent = 'Perfect budget! No surplus or deficit.';
        infoBox.style.display = 'flex';
    }

    warningBox.style.display = 'flex';
    document.getElementById('end-week-modal').classList.add('active');
}

function closeEndWeekModal() {
    document.getElementById('end-week-modal').classList.remove('active');
    currentWeekToEnd = null;
}

function confirmEndWeek() {
    if (!currentWeekToEnd) return;

    const weekKey = currentWeekToEnd;
    const weekName = getCategoryName(weekKey);
    const allocated = AppState.needs[weekKey].allocated;
    const spent = AppState.needs[weekKey].spent;
    const surplus = parseFloat((allocated - spent).toFixed(2));

    // Mark week as ended
    AppState.needs[weekKey].ended = true;

    if (surplus > 0) {
        // Surplus: Split 50/50 to both accounts
        const halfAmount = parseFloat((surplus / 2).toFixed(2));
        AppState.income.savings.balance = parseFloat((AppState.income.savings.balance + halfAmount).toFixed(2));
        AppState.income.personal.balance = parseFloat((AppState.income.personal.balance + halfAmount).toFixed(2));
        showNotification(`${weekName} ended! Surplus of Ksh ${formatCurrency(surplus)} added to income (50/50 split)`, 'success');
    } else if (surplus < 0) {
        // Deficit: Deduct from personal first, then savings if needed
        const deficit = Math.abs(surplus);
        const personalBalance = AppState.income.personal.balance;

        if (personalBalance >= deficit) {
            // Personal balance can cover the entire deficit
            AppState.income.personal.balance = parseFloat((personalBalance - deficit).toFixed(2));
            showNotification(`${weekName} ended! Deficit of Ksh ${formatCurrency(deficit)} deducted from Personal balance`, 'warning');
        } else if (personalBalance > 0) {
            // Personal balance covers part, savings covers the rest
            const remainingDeficit = parseFloat((deficit - personalBalance).toFixed(2));
            AppState.income.personal.balance = 0;
            AppState.income.savings.balance = Math.max(0, parseFloat((AppState.income.savings.balance - remainingDeficit).toFixed(2)));
            showNotification(`${weekName} ended! Personal balance used (Ksh ${formatCurrency(personalBalance)}). Remaining deficit (Ksh ${formatCurrency(remainingDeficit)}) deducted from Savings`, 'warning');
        } else {
            // Personal is zero, deduct entirely from savings
            AppState.income.savings.balance = Math.max(0, parseFloat((AppState.income.savings.balance - deficit).toFixed(2)));
            showNotification(`${weekName} ended! Deficit of Ksh ${formatCurrency(deficit)} deducted from Savings (Personal balance was zero)`, 'warning');
        }
    } else {
        showNotification(`${weekName} ended! Perfect budget - no surplus or deficit`, 'info');
    }

    closeEndWeekModal();
    updateAllDisplays();
    saveToStorage();
}

function endWeek(weekKey) {
    saveToStorage();
}

function openExternalIncomeModal() {
    document.getElementById('external-income-modal').classList.add('active');
    document.getElementById('external-income-amount').value = '';
    document.getElementById('external-income-description').value = '';
}

function closeExternalIncomeModal() {
    document.getElementById('external-income-modal').classList.remove('active');
}

function addExternalIncome() {
    const amount = parseFloat(document.getElementById('external-income-amount').value);
    const description = document.getElementById('external-income-description').value.trim() || 'External Income';

    if (isNaN(amount) || amount <= 0) {
        showAlert('Invalid Amount', 'Please enter a valid income amount.');
        return;
    }

    const halfAmount = parseFloat((amount / 2).toFixed(2));

    AppState.income.externalIncome = parseFloat((AppState.income.externalIncome + amount).toFixed(2));
    AppState.income.savings.balance = parseFloat((AppState.income.savings.balance + halfAmount).toFixed(2));
    AppState.income.personal.balance = parseFloat((AppState.income.personal.balance + halfAmount).toFixed(2));

    AppState.externalIncomeHistory.unshift({
        id: Date.now(),
        amount: amount,
        description: description,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
    });

    closeExternalIncomeModal();
    updateAllDisplays();
    saveToStorage();
    showNotification(`External income of Ksh ${formatCurrency(amount)} added (50/50 split)!`, 'success');
}

function deleteExpense(expenseId) {
    // Find the expense details
    let expense = null;
    let category = null;

    // Search in needs categories
    Object.keys(AppState.needs).forEach(cat => {
        const found = AppState.needs[cat].expenses.find(e => e.id === expenseId);
        if (found) {
            expense = found;
            category = cat;
        }
    });

    // Search in income categories if not found
    if (!expense) {
        ['savings', 'personal'].forEach(cat => {
            const found = AppState.income[cat].expenses.find(e => e.id === expenseId);
            if (found) {
                expense = found;
                category = cat;
            }
        });
    }

    if (!expense) return;

    // Check if week is ended
    if (category in AppState.needs && AppState.needs[category].ended) {
        showAlert('Cannot Delete', 'Cannot delete expenses from an ended week.');
        return;
    }

    // Store the expense ID for deletion
    expenseToDelete = expenseId;

    // Update modal with expense details
    document.getElementById('delete-expense-description').textContent = expense.description;
    document.getElementById('delete-expense-amount').textContent = `Ksh ${formatCurrency(expense.amount)}`;
    document.getElementById('delete-expense-category').textContent = getCategoryName(category);

    // Open the modal
    document.getElementById('delete-expense-modal').classList.add('active');
}

function closeDeleteExpenseModal() {
    document.getElementById('delete-expense-modal').classList.remove('active');
    expenseToDelete = null;
}

function confirmDeleteExpense() {
    if (!expenseToDelete) return;

    let expenseFound = false;
    let deletedExpense = null;

    // Search in needs categories
    Object.keys(AppState.needs).forEach(category => {
        const index = AppState.needs[category].expenses.findIndex(e => e.id === expenseToDelete);
        if (index > -1) {
            deletedExpense = AppState.needs[category].expenses[index];
            AppState.needs[category].spent = parseFloat((AppState.needs[category].spent - deletedExpense.amount).toFixed(2));
            AppState.needs[category].remaining = parseFloat((AppState.needs[category].remaining + deletedExpense.amount).toFixed(2));
            AppState.needs[category].expenses.splice(index, 1);
            expenseFound = true;
        }
    });

    // Search in income categories
    if (!expenseFound) {
        ['savings', 'personal'].forEach(category => {
            const index = AppState.income[category].expenses.findIndex(e => e.id === expenseToDelete);
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
        const allIndex = AppState.allExpenses.findIndex(e => e.id === expenseToDelete);
        if (allIndex > -1) AppState.allExpenses.splice(allIndex, 1);

        closeDeleteExpenseModal();
        updateAllDisplays();
        saveToStorage();
        showNotification('Expense deleted successfully!', 'success');
    }
}

function checkWeekProgress() {
    if (!AppState.monthStartDate) return;

    const now = new Date();
    const dayOfMonth = now.getDate();

    // Determine current week
    let currentWeek = 'fixed_week1';
    if (dayOfMonth > 7 && dayOfMonth <= 14) currentWeek = 'week2';
    else if (dayOfMonth > 14 && dayOfMonth <= 21) currentWeek = 'week3';
    else if (dayOfMonth > 21) currentWeek = 'week4';

    AppState.currentWeek = currentWeek;

    // Update current week display
    const weekDisplay = document.getElementById('current-week');
    if (weekDisplay) {
        weekDisplay.textContent = getCategoryName(currentWeek).replace('Fixed + ', '');
    }

    // Check if week is about to end (last 2 days of each week)
    const daysIntoWeek = dayOfMonth % 7 || 7;
    if (daysIntoWeek >= 6 && !AppState.needs[currentWeek].ended) {
        showNotification(`${getCategoryName(currentWeek)} is about to end! Don't forget to close it.`, 'warning');
    }

    // Schedule next check in 1 hour
    setTimeout(checkWeekProgress, 3600000);
}

function updateAllDisplays() {
    updateInputDashboard();
    updateNeedsDashboard();
    updateIncomeDashboard();
    updateCharts();
    updateMonthDisplay();
}

function updateInputDashboard() {
    document.getElementById('summary-allowance').textContent = `Ksh ${formatCurrency(AppState.monthlyAllowance)}`;

    const totalNeedsAllocated = Object.values(AppState.needs).reduce((sum, week) => sum + week.allocated, 0);
    const totalNeedsSpent = Object.values(AppState.needs).reduce((sum, week) => sum + week.spent, 0);

    document.getElementById('summary-needs').textContent = `Ksh ${formatCurrency(totalNeedsAllocated)}`;
    document.getElementById('summary-spent').textContent = `Ksh ${formatCurrency(totalNeedsSpent)}`;
    document.getElementById('summary-savings').textContent = `Ksh ${formatCurrency(AppState.income.savings.balance)}`;
    document.getElementById('summary-personal').textContent = `Ksh ${formatCurrency(AppState.income.personal.balance)}`;

    updateRecentExpenses();
}

function updateRecentExpenses() {
    const tbody = document.querySelector('#recent-expenses tbody');
    tbody.innerHTML = '';

    AppState.allExpenses.slice(0, 10).forEach(expense => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(expense.date)}</td>
            <td><span class="badge" data-status="${getExpenseStatus(expense)}">${getCategoryName(expense.category)}</span></td>
            <td>${expense.description}</td>
            <td class="text-danger">Ksh ${formatCurrency(expense.amount)}</td>
            <td><button class="btn-secondary delete-expense" data-id="${expense.id}">Delete</button></td>
        `;
        tbody.appendChild(row);
    });

    document.querySelectorAll('.delete-expense').forEach(button => {
        button.addEventListener('click', function() {
            deleteExpense(parseInt(this.dataset.id));
        });
    });
}

function updateNeedsDashboard() {
    const weekKeys = ['fixed_week1', 'week2', 'week3', 'week4'];
    const weekIds = ['week1', 'week2', 'week3', 'week4'];

    weekKeys.forEach((weekKey, index) => {
        const weekId = weekIds[index];
        const weekData = AppState.needs[weekKey];

        document.getElementById(`${weekId}-allocated`).textContent = `Ksh ${formatCurrency(weekData.allocated)}`;
        document.getElementById(`${weekId}-spent`).textContent = `Ksh ${formatCurrency(weekData.spent)}`;
        document.getElementById(`${weekId}-remaining`).textContent = `Ksh ${formatCurrency(weekData.remaining)}`;

        const percentage = weekData.allocated > 0 ? (weekData.spent / weekData.allocated) * 100 : 0;
        document.getElementById(`${weekId}-percentage`).textContent = `${Math.min(100, percentage).toFixed(1)}%`;
        document.getElementById(`${weekId}-progress`).style.width = `${Math.min(100, percentage)}%`;

        const badge = document.getElementById(`${weekId}-status`);
        const progressElement = document.getElementById(`${weekId}-progress`);
        const alertElement = document.getElementById(`${weekId}-alert`);
        const endWeekBtn = document.querySelector(`.end-week-btn[data-week="${weekKey}"]`);

        progressElement.className = 'progress-fill';

        if (weekData.ended) {
            badge.setAttribute('data-status', 'ended');
            badge.textContent = 'Ended';
            progressElement.classList.add('ended');
            endWeekBtn.disabled = true;
            endWeekBtn.textContent = 'Week Ended';
            alertElement.innerHTML = `<i class="fas fa-check-circle"></i><span>Week has been closed</span>`;
            alertElement.className = 'alert-message info';
            alertElement.style.display = 'flex';
        } else {
            endWeekBtn.disabled = false;
            endWeekBtn.textContent = 'End Week';

            if (weekData.remaining < 0) {
                badge.setAttribute('data-status', 'overspent');
                badge.textContent = 'Overspent';
                progressElement.classList.add('overspent');
                alertElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>Overspent by Ksh ${formatCurrency(Math.abs(weekData.remaining))}</span>`;
                alertElement.className = 'alert-message danger';
                alertElement.style.display = 'flex';
            } else if (percentage < 50) {
                badge.setAttribute('data-status', 'underspent');
                badge.textContent = 'Underspent';
                progressElement.classList.add('underspent');
                alertElement.innerHTML = `<i class="fas fa-trophy"></i><span>Great savings! Ksh ${formatCurrency(weekData.remaining)} remaining</span>`;
                alertElement.className = 'alert-message success';
                alertElement.style.display = 'flex';
            } else if (percentage >= 90) {
                badge.setAttribute('data-status', 'on-budget');
                badge.textContent = 'Near Limit';
                progressElement.classList.add('warning');
                alertElement.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>Approaching budget limit</span>`;
                alertElement.className = 'alert-message warning';
                alertElement.style.display = 'flex';
            } else {
                badge.setAttribute('data-status', 'on-budget');
                badge.textContent = 'On Budget';
                alertElement.style.display = 'none';
            }
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
    document.getElementById('flow-allowance').textContent = `Ksh ${formatCurrency(AppState.monthlyAllowance)}`;
    document.getElementById('flow-needs').textContent = `Ksh ${formatCurrency(Object.values(AppState.needs).reduce((sum, w) => sum + w.allocated, 0))}`;
    document.getElementById('flow-external').textContent = `Ksh ${formatCurrency(AppState.income.externalIncome)}`;
    document.getElementById('flow-savings').textContent = `Ksh ${formatCurrency(AppState.income.savings.balance)}`;
    document.getElementById('flow-personal').textContent = `Ksh ${formatCurrency(AppState.income.personal.balance)}`;

    document.getElementById('savings-balance').textContent = `Ksh ${formatCurrency(AppState.income.savings.balance)}`;
    document.getElementById('personal-balance').textContent = `Ksh ${formatCurrency(AppState.income.personal.balance)}`;
    document.getElementById('personal-spent').textContent = `Ksh ${formatCurrency(AppState.income.personal.spent)}`;

    updateCategoryExpensesList('savings-expenses', AppState.income.savings.expenses);
    updateCategoryExpensesList('personal-expenses', AppState.income.personal.expenses);
    updateTransactionsTable();
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

    allTransactions.slice(0, 15).forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td><span class="badge">${transaction.type}</span></td>
            <td>${transaction.description}</td>
            <td>${transaction.category}</td>
            <td class="text-danger">-Ksh ${formatCurrency(transaction.amount)}</td>
            <td>Ksh ${formatCurrency(transaction.balance)}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateMonthDisplay() {
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"];
    const monthDisplay = document.getElementById('current-month');
    if (monthDisplay) {
        monthDisplay.textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    }
}

function initCharts() {
    const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
    const textColor = isLightTheme ? '#000000' : '#ffffff';  // Black in light, white in dark
    const gridColor = isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(94, 58, 238, 0.3)';  // Light gray in light, purple in dark

    const barCanvas = document.getElementById('needs-bar-chart');
    if (barCanvas) {
        needsBarChart = new Chart(barCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Fixed + Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Allocated',
                    data: [0, 0, 0, 0],
                    backgroundColor: 'rgba(94, 58, 238, 0.7)',
                    borderColor: 'rgba(94, 58, 238, 1)',
                    borderWidth: 1
                }, {
                    label: 'Spent',
                    data: [0, 0, 0, 0],
                    backgroundColor: 'rgba(245, 158, 11, 0.7)',
                    borderColor: 'rgba(245, 158, 11, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: textColor,
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textColor,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            font: {
                                size: 11
                            },
                            callback: value => 'Ksh ' + formatCurrency(value)
                        },
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        }
                    }
                }
            }
        });
    }

    const pieCanvas = document.getElementById('money-pie-chart');
    if (pieCanvas) {
        moneyPieChart = new Chart(pieCanvas.getContext('2d'), {
            type: 'pie',
            data: {
                labels: ['Needs', 'Savings', 'Personal'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['rgba(94, 58, 238, 0.8)', 'rgba(46, 204, 113, 0.8)', 'rgba(155, 89, 182, 0.8)'],
                    borderColor: ['rgba(94, 58, 238, 1)', 'rgba(46, 204, 113, 1)', 'rgba(155, 89, 182, 1)'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            padding: 20,
                            font: {
                                size: 12,
                                family: "'Poppins', sans-serif"
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: isLightTheme ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 12, 41, 0.9)',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: 'rgba(94, 58, 238, 0.5)',
                        borderWidth: 1,
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

        moneyPieChart.data.datasets[0].data = [totalNeedsSpent, totalSavings, totalPersonal];
        moneyPieChart.update();
    }
}

function updateChartColors() {
    const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
    const textColor = isLightTheme ? '#000000' : '#ffffff';  // Black in light, white in dark
    const gridColor = isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(94, 58, 238, 0.3)';  // Light gray in light, purple in dark

    if (needsBarChart) {
        needsBarChart.options.plugins.legend.labels.color = textColor;
        needsBarChart.options.scales.x.ticks.color = textColor;
        needsBarChart.options.scales.x.grid.color = gridColor;
        needsBarChart.options.scales.y.ticks.color = textColor;
        needsBarChart.options.scales.y.grid.color = gridColor;
        needsBarChart.update('none'); // Use 'none' to prevent animation which might cause flickering
    }

    if (moneyPieChart) {
        moneyPieChart.options.plugins.legend.labels.color = textColor;
        moneyPieChart.update('none');
    }
}

function resetMonth() {
    const modalContent = `
        <p>Are you sure you want to reset for a new month?</p>
        <p><strong>This will:</strong></p>
        <ul style="text-align: left; margin: 15px 0; padding-left: 20px;">
            <li>Clear all expenses</li>
            <li>Reset all week budgets</li>
            <li><strong>KEEP your Savings and Personal balances</strong></li>
            <li>Unlock budget inputs</li>
            <li>Keep your budget settings</li>
        </ul>
    `;

    showAlert('Reset Month', modalContent, () => {
        const monthlyAllowance = AppState.monthlyAllowance;
        const fixedWeek1Budget = AppState.fixedWeek1Budget;
        const weeks2to4Budget = AppState.weeks2to4Budget;

        // PRESERVE savings and personal balances
        const savingsBalance = AppState.income.savings.balance;
        const personalBalance = AppState.income.personal.balance;

        // Reset all state except budget values and income balances
        AppState.needs = {
            fixed_week1: { allocated: 0, spent: 0, remaining: 0, expenses: [], ended: false },
            week2: { allocated: 0, spent: 0, remaining: 0, expenses: [], ended: false },
            week3: { allocated: 0, spent: 0, remaining: 0, expenses: [], ended: false },
            week4: { allocated: 0, spent: 0, remaining: 0, expenses: [], ended: false }
        };

        AppState.income = {
            externalIncome: 0,
            savings: { balance: savingsBalance, spent: 0, expenses: [] },
            personal: { balance: personalBalance, spent: 0, expenses: [] }
        };

        AppState.allExpenses = [];
        AppState.externalIncomeHistory = [];
        AppState.budgetLocked = false;
        AppState.currentWeek = 'fixed_week1';

        // Unlock inputs
        document.getElementById('monthly-allowance').disabled = false;
        document.getElementById('fixed-week1-budget').disabled = false;
        document.getElementById('update-budget').disabled = false;

        // Keep the budget values in inputs
        document.getElementById('monthly-allowance').value = monthlyAllowance || '';
        document.getElementById('fixed-week1-budget').value = fixedWeek1Budget || '';

        setMonthStartDate();
        updateAllDisplays();
        saveToStorage();
        showNotification('Month has been reset! Your Savings and Personal balances have been preserved.', 'success');
    });
}

function openClearAllDataModal() {
    document.getElementById('clear-all-data-modal').classList.add('active');
}

function closeClearAllDataModal() {
    document.getElementById('clear-all-data-modal').classList.remove('active');
}

function confirmClearAllData() {
    // Reset EVERYTHING to initial state
    AppState.monthlyAllowance = 0;
    AppState.fixedWeek1Budget = 0;
    AppState.weeks2to4Budget = 0;
    AppState.budgetLocked = false;
    AppState.currentWeek = 'fixed_week1';

    AppState.needs = {
        fixed_week1: { allocated: 0, spent: 0, remaining: 0, expenses: [], ended: false },
        week2: { allocated: 0, spent: 0, remaining: 0, expenses: [], ended: false },
        week3: { allocated: 0, spent: 0, remaining: 0, expenses: [], ended: false },
        week4: { allocated: 0, spent: 0, remaining: 0, expenses: [], ended: false }
    };

    AppState.income = {
        externalIncome: 0,
        savings: { balance: 0, spent: 0, expenses: [] },
        personal: { balance: 0, spent: 0, expenses: [] }
    };

    AppState.allExpenses = [];
    AppState.externalIncomeHistory = [];

    // Clear form inputs
    document.getElementById('monthly-allowance').value = '';
    document.getElementById('fixed-week1-budget').value = '';
    document.getElementById('monthly-allowance').disabled = false;
    document.getElementById('fixed-week1-budget').disabled = false;
    document.getElementById('update-budget').disabled = false;

    // Clear localStorage
    localStorage.removeItem('expensify-budget-app');

    // Reset month start date
    setMonthStartDate();

    // Close modal
    closeClearAllDataModal();

    // Update all displays
    updateAllDisplays();

    // Show success notification
    showNotification('All data has been cleared! Starting fresh.', 'success');
}

function formatCurrency(amount) {
    const formatted = parseFloat(amount).toFixed(2);
    // Remove .00 if it's a whole number
    if (formatted.endsWith('.00')) {
        return parseFloat(amount).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }
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
    messageElement.innerHTML = message; // Changed from textContent to innerHTML to support HTML
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
    if (modal) modal.classList.remove('active');
}

function saveToStorage() {
    try {
        const data = {
            state: AppState,
            version: '3.0',
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('expensify-budget-app', JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

function loadFromStorage() {
    try {
        const saved = localStorage.getItem('expensify-budget-app');
        if (saved) {
            const data = JSON.parse(saved);

            // Check if it's current month's data
            const savedDate = new Date(data.state.monthStartDate);
            const currentDate = new Date();

            if (savedDate.getMonth() === currentDate.getMonth() &&
                savedDate.getFullYear() === currentDate.getFullYear()) {
                Object.assign(AppState, data.state);

                // Restore locked state
                if (AppState.budgetLocked) {
                    document.getElementById('monthly-allowance').disabled = true;
                    document.getElementById('fixed-week1-budget').disabled = true;
                    document.getElementById('update-budget').disabled = true;
                    document.getElementById('monthly-allowance').value = AppState.monthlyAllowance;
                    document.getElementById('fixed-week1-budget').value = AppState.fixedWeek1Budget;
                }
            } else {
                // New month - keep budget values but reset everything else
                showNotification('New month has began! Please set up your budget.', 'info');
            }
        }
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure all CSS is applied
    setTimeout(initApp, 100);
});