/**
 * components.js - Component Renderers for VendTrack
 * Dynamic template engines generating responsive dashboard grids, visual SVG graphs, coil cabinet structures, catalog tables and log streams.
 */

// Helper to format currency
const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
};

// Helper to get product details
const getProduct = (products, id) => {
  return products.find(p => p.id === id);
};

/**
 * Render Dashboard KPI panels
 */
export function renderKPIs(store) {
  const financial = store.getFinancialSummary();
  const health = store.getHealthSummary();
  
  // Update Revenue Card
  document.getElementById('kpi-revenue').innerHTML = `
    <div class="kpi-content">
      <div>
        <div class="kpi-label">Weekly Revenue</div>
        <div class="kpi-value">${formatCurrency(financial.revenue)}</div>
        <div class="kpi-subtext up">
          <i class="lucide-trending-up"></i>
          <span>+12.4% vs last week</span>
        </div>
      </div>
      <div class="kpi-icon"><i class="lucide-dollar-sign"></i></div>
    </div>
  `;

  // Update Net Profit Card
  document.getElementById('kpi-profit').innerHTML = `
    <div class="kpi-content">
      <div>
        <div class="kpi-label">Weekly Profit</div>
        <div class="kpi-value">${formatCurrency(financial.profit)}</div>
        <div class="kpi-subtext up">
          <i class="lucide-arrow-up-right"></i>
          <span>Margin: ${financial.margin}%</span>
        </div>
      </div>
      <div class="kpi-icon"><i class="lucide-wallet"></i></div>
    </div>
  `;

  // Update Stock Health Card
  let healthClass = 'success';
  if (health.stockHealth < 40) healthClass = 'danger';
  else if (health.stockHealth < 75) healthClass = 'warning';
  
  document.getElementById('kpi-health').innerHTML = `
    <div class="kpi-content">
      <div>
        <div class="kpi-label">Stock Capacity</div>
        <div class="kpi-value">${health.stockHealth}%</div>
        <div class="kpi-subtext ${health.stockHealth < 75 ? 'down' : 'up'}">
          <span>Filled: ${health.totalQty} / ${health.totalCapacity} units</span>
        </div>
      </div>
      <div class="kpi-icon"><i class="lucide-layers"></i></div>
    </div>
  `;

  // Update Alerts count
  document.getElementById('kpi-alerts').innerHTML = `
    <div class="kpi-content">
      <div>
        <div class="kpi-label">Restock Alerts</div>
        <div class="kpi-value">${health.lowCount}</div>
        <div class="kpi-subtext ${health.lowCount > 0 ? 'down' : ''}">
          <i class="lucide-alert-triangle"></i>
          <span>Coils at &lt; 25% stock</span>
        </div>
      </div>
      <div class="kpi-icon"><i class="lucide-bell"></i></div>
    </div>
  `;
}

/**
 * Render dynamic SVG Sales trend chart representing past 7 days of sales
 */
export function renderSalesChart(store) {
  const container = document.getElementById('dashboard-sales-chart');
  if (!container) return;

  const transactions = store.getTransactions().filter(t => t.type === 'sale');
  const now = new Date();
  
  // Calculate daily totals for last 7 days
  const dailyData = [];
  const daysName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dayString = d.toDateString();
    
    // Filter sales on this specific calendar day
    const daySales = transactions.filter(t => new Date(t.timestamp).toDateString() === dayString);
    const totalSales = daySales.reduce((acc, curr) => acc + curr.price, 0);
    
    dailyData.push({
      label: daysName[d.getDay()],
      value: totalSales
    });
  }

  // Define SVG dimensions & padding
  const width = 600;
  const height = 280;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Find max sales value to scale graph height (fallback to 10 if zero)
  const maxVal = Math.max(...dailyData.map(d => d.value), 10) * 1.15;

  // Calculate pixel coordinates for line vertices
  const points = dailyData.map((d, index) => {
    const x = paddingLeft + (index / (dailyData.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.value / maxVal) * chartHeight;
    return { x, y, val: d.value, label: d.label };
  });

  // Build the SVG path string
  let linePathStr = '';
  let fillPathStr = '';

  if (points.length > 0) {
    linePathStr = `M ${points[0].x} ${points[0].y}`;
    points.forEach((p, index) => {
      if (index > 0) {
        // Curve factor (cubic bezier) for smooth wave appearance
        const prev = points[index - 1];
        const cpX1 = prev.x + (p.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = prev.x + (p.x - prev.x) / 2;
        const cpY2 = p.y;
        linePathStr += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
      }
    });

    // Fill path traces the baseline
    fillPathStr = `${linePathStr} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
  }

  // Draw Gridlines and Axis Text
  const yTicks = 4;
  let gridLines = '';
  for (let i = 0; i <= yTicks; i++) {
    const yRatio = i / yTicks;
    const y = paddingTop + chartHeight - yRatio * chartHeight;
    const val = (yRatio * maxVal).toFixed(0);
    gridLines += `
      <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" class="chart-grid-line" />
      <text x="${paddingLeft - 10}" y="${y + 4}" text-anchor="end" class="chart-text">${formatCurrency(val)}</text>
    `;
  }

  // Draw Points & Labels
  let pointNodes = '';
  let xLabels = '';
  points.forEach(p => {
    pointNodes += `
      <circle cx="${p.x}" cy="${p.y}" class="chart-point" data-value="${formatCurrency(p.val)}" />
    `;
    xLabels += `
      <text x="${p.x}" y="${height - paddingBottom + 20}" text-anchor="middle" class="chart-text">${p.label}</text>
    `;
  });

  // Assemble full SVG
  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="svg-chart">
      <defs>
        <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent-purple)" stop-opacity="0.35" />
          <stop offset="100%" stop-color="var(--accent-purple)" stop-opacity="0.00" />
        </linearGradient>
      </defs>
      
      <!-- Gridlines -->
      ${gridLines}
      
      <!-- Axis Lines -->
      <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${paddingTop + chartHeight}" class="chart-axis-line" />
      <line x1="${paddingLeft}" y1="${paddingTop + chartHeight}" x2="${width - paddingRight}" y2="${paddingTop + chartHeight}" class="chart-axis-line" />
      
      <!-- Gradient Fill under curve -->
      <path d="${fillPathStr}" class="chart-gradient-fill" />
      
      <!-- Main Line -->
      <path d="${linePathStr}" class="chart-line" />
      
      <!-- Data Vertices -->
      ${pointNodes}
      
      <!-- X Labels -->
      ${xLabels}
    </svg>
  `;
}

/**
 * Render low-stock alerts panel on dashboard
 */
export function renderDashboardAlerts(store) {
  const list = document.getElementById('dashboard-alerts-list');
  if (!list) return;

  const lowCoils = store.getLowStockCoils();

  if (lowCoils.length === 0) {
    list.innerHTML = `
      <div class="empty-alerts" style="text-align: center; color: var(--text-muted); padding: 32px 0;">
        <i class="lucide-check-circle" style="font-size: 2rem; color: var(--color-success); margin-bottom: 8px;"></i>
        <p style="font-size: 0.85rem; font-weight: 600;">All machines fully stocked!</p>
      </div>
    `;
    return;
  }

  list.innerHTML = lowCoils.map(item => {
    const isCritical = item.qty === 0;
    const isWarning = !isCritical && item.ratio <= 0.25;
    
    let indicatorClass = 'orange';
    if (isCritical) indicatorClass = 'red';

    return `
      <div class="alert-item">
        <div class="alert-status-indicator ${indicatorClass}"></div>
        <div class="alert-info">
          <div class="alert-item-name">${item.productName}</div>
          <div class="alert-item-loc">${item.machineName} &bull; Coil ${item.coilId}</div>
        </div>
        <div class="alert-qty">
          <div class="alert-qty-text ${indicatorClass}">${item.qty} left</div>
          <div class="alert-capacity">of ${item.maxCapacity} cap</div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render cards list for the Machines section
 */
export function renderMachineList(store) {
  const container = document.getElementById('machines-grid-container');
  if (!container) return;

  const machines = store.getMachines();
  const products = store.getProducts();

  container.innerHTML = machines.map(m => {
    // Calculate details
    let totalCapacity = 0;
    let currentQty = 0;
    let emptyCount = 0;

    m.coils.forEach(c => {
      totalCapacity += c.maxCapacity;
      currentQty += c.qty;
      if (c.qty === 0) emptyCount++;
    });

    const stockRatio = totalCapacity > 0 ? (currentQty / totalCapacity) : 0;
    const stockPercent = (stockRatio * 100).toFixed(0);

    let statusText = 'Fully Stocked';
    let statusClass = 'success';
    let meterClass = 'success';

    if (emptyCount > 0) {
      statusText = `${emptyCount} Empty Coils`;
      statusClass = 'error';
      meterClass = 'danger';
    } else if (stockRatio <= 0.4) {
      statusText = 'Needs Restocking';
      statusClass = 'warning';
      meterClass = 'warning';
    } else if (stockRatio <= 0.75) {
      statusText = 'Stock Healthy';
      statusClass = 'warning';
      meterClass = 'warning';
    }

    return `
      <div class="glass-card machine-card" data-machine-id="${m.id}">
        <div class="machine-card-header">
          <div>
            <div class="machine-name">${m.name}</div>
            <div class="machine-location">
              <i class="lucide-map-pin" style="font-size: 0.8rem;"></i>
              <span>${m.location}</span>
            </div>
          </div>
          <span class="machine-status-badge ${statusClass}">
            <i class="lucide-${statusClass === 'success' ? 'check' : 'alert-triangle'}" style="font-size: 0.75rem;"></i>
            <span>${statusText}</span>
          </span>
        </div>
        
        <div class="machine-stats-row">
          <div>
            <div class="stat-item-val">${m.rows} &times; ${m.cols}</div>
            <div class="stat-item-lbl">Coil Layout</div>
          </div>
          <div>
            <div class="stat-item-val">${currentQty} / ${totalCapacity}</div>
            <div class="stat-item-lbl">Total Units</div>
          </div>
        </div>

        <div class="stock-meter-container">
          <div class="meter-header">
            <span>Capacity Stocked</span>
            <span style="font-weight: 700;">${stockPercent}%</span>
          </div>
          <div class="meter-bar-outer">
            <div class="meter-bar-inner ${meterClass}" style="width: ${stockPercent}%"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render structural coils inside the Vending Cabinet Grid
 */
export function renderMachineCabinet(store, machineId) {
  const container = document.getElementById('cabinet-coils-grid');
  if (!container) return;

  const machine = store.getMachine(machineId);
  if (!machine) return;

  const products = store.getProducts();

  // Set grid template style dynamically based on columns
  container.style.gridTemplateColumns = `repeat(${machine.cols}, minmax(110px, 1fr))`;

  container.innerHTML = machine.coils.map(coil => {
    const prod = getProduct(products, coil.productId);
    const fillPercent = (coil.qty / coil.maxCapacity) * 100;
    
    let stockClass = 'green';
    if (coil.qty === 0) stockClass = 'red';
    else if (coil.qty / coil.maxCapacity <= 0.25) stockClass = 'orange';

    const pName = prod ? prod.name : 'Empty Slot';
    const pCat = prod ? prod.category : 'Unassigned';
    
    // Simple icon builder based on category
    let productVisual = `<div class="coil-product-icon-fallback"><i class="lucide-ban"></i></div>`;
    if (prod) {
      let iconName = 'cookie';
      if (prod.category === 'Drink') iconName = 'cup-soda';
      else if (prod.category === 'Candy') iconName = 'candy';
      
      productVisual = `
        <div class="coil-product-icon-fallback" style="color: var(--accent-purple)">
          <i class="lucide-${iconName}"></i>
        </div>
      `;
    }

    // Disable vending action if empty
    const isVendorDisabled = coil.qty === 0 ? 'disabled' : '';

    return `
      <div class="coil-cell" data-coil-id="${coil.coilId}">
        <div class="coil-badge">${coil.coilId}</div>
        
        <div class="coil-product-visual">
          ${productVisual}
        </div>
        
        <div class="coil-spring-visual"></div>
        <div class="coil-product-name" title="${pName}">${pName}</div>
        <div class="coil-price">${prod ? formatCurrency(coil.price) : '--'}</div>
        
        <div class="coil-stock-pill ${stockClass}">
          <span>Stock</span>
          <span style="display: flex; align-items: center; gap: 4px;">
            ${coil.qty} / ${coil.maxCapacity}
            <span class="coil-stock-dot"></span>
          </span>
        </div>

        <!-- Overlays showing action options -->
        <div class="coil-action-overlay">
          ${prod ? `
            <button class="coil-action-btn sell" data-action="sell" data-coil="${coil.coilId}" ${isVendorDisabled}>
              <i class="lucide-shopping-cart" style="font-size: 0.75rem;"></i>
              <span>Vended / Sale</span>
            </button>
            <button class="coil-action-btn restock" data-action="restock" data-coil="${coil.coilId}">
              <i class="lucide-plus" style="font-size: 0.75rem;"></i>
              <span>Restock Stock</span>
            </button>
          ` : ''}
          <button class="coil-action-btn config" data-action="edit" data-coil="${coil.coilId}">
            <i class="lucide-settings" style="font-size: 0.75rem;"></i>
            <span>${prod ? 'Change Coil' : 'Assign Product'}</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render warehouse product catalog table (and sidebar stats)
 */
export function renderWarehouseCatalog(store, filterQuery = '', filterCategory = 'All') {
  const tbody = document.getElementById('catalog-table-body');
  if (!tbody) return;

  const products = store.getProducts();

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(filterQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (filteredProducts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 48px 0;">
          <i class="lucide-package-open" style="font-size: 2rem; margin-bottom: 8px; color: var(--border-color);"></i>
          <p style="font-size: 0.9rem; font-weight: 500;">No products registered match your filter.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredProducts.map(p => {
    let stockClass = 'green';
    if (p.stock === 0) stockClass = 'red';
    else if (p.stock < 15) stockClass = 'orange';

    let iconName = 'cookie';
    if (p.category === 'Drink') iconName = 'cup-soda';
    else if (p.category === 'Candy') iconName = 'candy';

    const profit = p.price - p.cost;
    const margin = ((profit / p.price) * 100).toFixed(0);

    return `
      <tr>
        <td>
          <div class="table-product-cell">
            <div class="table-product-avatar" style="color: var(--accent-purple);">
              <i class="lucide-${iconName}"></i>
            </div>
            <div class="table-product-info">
              <div class="name">${p.name}</div>
              <div class="category">${p.sku || '--'}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">
            ${p.category}
          </span>
        </td>
        <td style="font-weight: 700;">${formatCurrency(p.cost)}</td>
        <td style="font-weight: 700; color: var(--accent-cyan);">${formatCurrency(p.price)}</td>
        <td>
          <div style="font-size: 0.85rem; font-weight: 700;">
            ${formatCurrency(profit)}
            <span style="color: var(--color-success); font-size: 0.75rem; font-weight: 600; margin-left: 4px;">(${margin}%)</span>
          </div>
        </td>
        <td>
          <span class="table-stock-badge ${stockClass}">
            ${p.stock} units
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="table-action-btn" data-action="buy-stock" data-product-id="${p.id}" title="Buy stock for warehouse">
              <i class="lucide-package-plus"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render transactions log data grid
 */
export function renderTransactions(store, filterQuery = '', filterType = 'All') {
  const tbody = document.getElementById('logs-table-body');
  if (!tbody) return;

  const txs = store.getTransactions();

  // Filter logs
  const filteredTxs = txs.filter(t => {
    const matchesSearch = t.productName.toLowerCase().includes(filterQuery.toLowerCase()) || 
                          t.machineName.toLowerCase().includes(filterQuery.toLowerCase());
    
    let matchesType = true;
    if (filterType !== 'All') {
      if (filterType === 'sales') matchesType = (t.type === 'sale');
      else if (filterType === 'restocks') matchesType = (t.type === 'restock' || t.type === 'wh_restock');
    }

    return matchesSearch && matchesType;
  });

  if (filteredTxs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 48px 0;">
          <i class="lucide-file-text" style="font-size: 2rem; margin-bottom: 8px; color: var(--border-color);"></i>
          <p style="font-size: 0.9rem; font-weight: 500;">No transactions matching your criteria.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredTxs.map(t => {
    const date = new Date(t.timestamp);
    const dateString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let typeText = 'Machine Sale';
    let typeClass = 'sale';
    let amountText = `+${formatCurrency(t.price)}`;
    let amountStyle = 'color: var(--accent-cyan); font-weight: 800;';

    if (t.type === 'restock') {
      typeText = `Machine Restock`;
      typeClass = 'restock';
      amountText = `${t.qty} units`;
      amountStyle = 'color: var(--text-primary); font-weight: 700;';
    } else if (t.type === 'wh_restock') {
      typeText = `Purchased Inventory`;
      typeClass = 'wh_restock';
      amountText = `-${formatCurrency(t.cost)}`;
      amountStyle = 'color: var(--color-danger); font-weight: 800;';
    }

    return `
      <tr>
        <td>
          <div style="font-weight: 600; font-size: 0.85rem;">${dateString}</div>
        </td>
        <td>
          <span class="badge-transaction-type ${typeClass}">
            <i class="lucide-${t.type === 'sale' ? 'shopping-cart' : (t.type === 'restock' ? 'package' : 'warehouse')}" style="font-size: 0.7rem;"></i>
            <span>${typeText}</span>
          </span>
        </td>
        <td style="font-weight: 700;">${t.productName}</td>
        <td>
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">${t.machineName}</div>
        </td>
        <td style="text-align: right;">
          <span style="${amountStyle}">${amountText}</span>
        </td>
      </tr>
    `;
  }).join('');
}
