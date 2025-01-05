const apiUrl = "https://api.exchangerate-api.com/v4/latest/USD";

// Fetch Currency Rates
const fetchCurrencyRates = async () => {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error during API request:", error);
    }
};

// Insert Data into AlaSQL Table
const setupSQLTable = (data) => {
    alasql("CREATE TABLE currency_rates (currency_code STRING, exchange_rate NUMBER, base_currency STRING, date STRING)");

    const { base, date, rates } = data;
    for (const [currency, rate] of Object.entries(rates)) {
        alasql("INSERT INTO currency_rates VALUES (?, ?, ?, ?)", [currency, rate, base, date]);
    }
};

// Populate Dropdowns
const populateDropdowns = (data) => {
    const fromCurrency = document.getElementById("fromCurrency");
    const toCurrency = document.getElementById("toCurrency");

    for (const currency in data.rates) {
        const option = `<option value="${currency}">${currency}</option>`;
        fromCurrency.innerHTML += option;
        toCurrency.innerHTML += option;
    }

    fromCurrency.value = "USD";
    toCurrency.value = "UAH";
};

// Handle Conversion
const handleConversion = (data) => {
    const form = document.getElementById("conversionForm");
    const result = document.getElementById("conversionResult");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const amount = parseFloat(document.getElementById("amount").value);
        const fromCurrency = document.getElementById("fromCurrency").value;
        const toCurrency = document.getElementById("toCurrency").value;

        if (fromCurrency && toCurrency && !isNaN(amount)) {
            const rate = data.rates[toCurrency] / data.rates[fromCurrency];
            const convertedAmount = (amount * rate).toFixed(2);
            result.textContent = `${amount} ${fromCurrency} = ${convertedAmount} ${toCurrency}`;
        } else {
            result.textContent = "Please fill in all fields.";
        }
    });
};

// Render Table
let sortDescending = true;
const renderTable = () => {
    const query = sortDescending
        ? "SELECT * FROM currency_rates ORDER BY exchange_rate DESC"
        : "SELECT * FROM currency_rates ORDER BY exchange_rate ASC";
    
    const data = alasql(query);
    const table = document.getElementById("currencyTable");
    table.innerHTML = `
        <tr>
            <th>Currency</th>
            <th id="exchangeRateHeader">Exchange Rate <span class="sort-icon">${sortDescending ? '▼' : '▲'}</span></th>
            <th>Base Currency</th>
            <th>Date</th>
        </tr>
    `;

    data.forEach(row => {
        table.innerHTML += `
            <tr>
                <td>${row.currency_code}</td>
                <td>${row.exchange_rate}</td>
                <td>${row.base_currency}</td>
                <td>${row.date}</td>
            </tr>
        `;
    });

    // Add sorting functionality
    const exchangeRateHeader = document.getElementById("exchangeRateHeader");
    exchangeRateHeader.addEventListener("click", () => {
        sortDescending = !sortDescending;
        renderTable();
    });
};

// Render Chart
const renderChart = () => {
    const data = alasql("SELECT currency_code, exchange_rate FROM currency_rates");
    const ctx = document.getElementById("currencyChart").getContext("2d");

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(row => row.currency_code),
            datasets: [{
                label: 'Exchange Rate',
                data: data.map(row => row.exchange_rate),
                backgroundColor: 'rgba(44, 62, 80, 0.8)',
                borderColor: 'rgba(44, 62, 80, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
};

// Main Function
fetchCurrencyRates().then((data) => {
    if (data) {
        setupSQLTable(data);
        populateDropdowns(data);
        handleConversion(data);
        renderTable();
        renderChart();
    }
});

const updateStatusMessage = (message, isSuccess) => {
    const statusMessage = document.getElementById("statusMessage");
    statusMessage.textContent = `Status: ${message}`;
    statusMessage.style.color = isSuccess ? "green" : "red";
};

// Виклик функції після оновлення таблиці
fetchCurrencyRates().then((data) => {
    if (data) {
        setupSQLTable(data);
        populateDropdowns(data);
        handleConversion(data);
        renderTable();
        renderChart();
        sendDataToGoogleSheets(); // Передача даних
    }
});