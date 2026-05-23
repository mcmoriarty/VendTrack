/**
 * app.js - UI Controller & Event Binder for VendTrack
 * Orchestrates navigation switches, form submit flows, search filters, modal triggers, and the dynamic success toast animation system.
 */

import { StateStore } from './store.js';
import * as components from './components.js';

// Instantiate State Engine
const store = new StateStore();

// UI State Tracker
let currentView = 'dashboard';
let activeMachineId = null;

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================
function showToast(title, message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let iconName = 'check-circle';
  if (type === 'info') iconName = 'info';
  else if (type === 'warning') iconName = 'alert-triangle';
  else if (type === 'error') iconName = 'x-circle';

  toast.innerHTML = `
    <div class="toast-icon"><i data-lucide="${iconName}"></i></div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close"><i data-lucide="x"></i></button>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  // Close button listener
  toast.querySelector('.toast-close').addEventListener('click', () => {
    removeToast(toast);
  });

  // Auto remove toast
  setTimeout(() => {
    removeToast(toast);
  }, 4000);
}

function removeToast(toast) {
  if (toast.parentNode) {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }
}

// ==========================================
// VIEW ROUTER & NAVIGATION ENGINE
// ==========================================
function switchView(targetViewId) {
  // Hide active sections, display target
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const targetView = document.getElementById(`view-${targetViewId}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update navigation items state
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-view') === targetViewId) {
      item.classList.add('active');
    }
  });

  currentView = targetViewId;
  refreshUI();
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar && backdrop) {
    sidebar.classList.remove('active');
    backdrop.classList.remove('active');
  }
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar && backdrop) {
    sidebar.classList.toggle('active');
    backdrop.classList.toggle('active');
  }
}


// ==========================================
// DRAWERS / DIALOGS MANAGER
// ==========================================
function openDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (drawer) {
    drawer.classList.add('active');
  }
}

function closeDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (drawer) {
    drawer.classList.remove('active');
  }
}

function closeAllDrawers() {
  document.querySelectorAll('.modal-overlay').forEach(drawer => {
    drawer.classList.remove('active');
  });
}

// ==========================================
// UI REFRESH DISPATCHER
// ==========================================
function refreshUI() {
  // Always update icons
  lucide.createIcons();

  if (currentView === 'dashboard') {
    components.renderKPIs(store);
    components.renderSalesChart(store);
    components.renderDashboardAlerts(store);
  } 
  
  else if (currentView === 'machines') {
    components.renderMachineList(store);
  } 
  
  else if (currentView === 'machine-detail' && activeMachineId) {
    const machine = store.getMachine(activeMachineId);
    if (!machine) {
      switchView('machines');
      return;
    }
    
    // Update headers info
    document.getElementById('detail-machine-name').textContent = machine.name;
    document.getElementById('detail-machine-location').innerHTML = `
      <i data-lucide="map-pin" style="width: 14px;"></i> <span>${machine.location}</span>
    `;

    // Counts
    let maxCap = 0;
    let currQty = 0;
    let emptyCoils = 0;
    machine.coils.forEach(c => {
      maxCap += c.maxCapacity;
      currQty += c.qty;
      if (c.qty === 0) emptyCoils++;
    });

    document.getElementById('detail-stock-count').textContent = `${currQty} / ${maxCap}`;
    
    const emptyBadge = document.getElementById('detail-empty-coils');
    emptyBadge.textContent = emptyCoils;
    if (emptyCoils > 0) {
      emptyBadge.style.color = 'var(--color-danger)';
    } else {
      emptyBadge.style.color = 'var(--color-success)';
    }

    components.renderMachineCabinet(store, activeMachineId);
  } 
  
  else if (currentView === 'warehouse') {
    const query = document.getElementById('catalog-search-input').value;
    const cat = document.getElementById('catalog-category-filter').value;
    components.renderWarehouseCatalog(store, query, cat);

    // Update Warehouse Summary figures
    const products = store.getProducts();
    const uniqueCount = products.length;
    const totalStock = products.reduce((acc, curr) => acc + curr.stock, 0);
    const assetValue = products.reduce((acc, curr) => acc + (curr.cost * curr.stock), 0);

    document.getElementById('wh-stat-unique').textContent = uniqueCount;
    document.getElementById('wh-stat-total-stock').textContent = `${totalStock} units`;
    document.getElementById('wh-stat-value').textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(assetValue);
  } 
  
  else if (currentView === 'logs') {
    const query = document.getElementById('logs-search-input').value;
    const type = document.getElementById('logs-type-filter').value;
    components.renderTransactions(store, query, type);
  }

  // Bind icons again after nested renders
  lucide.createIcons();
}

// ==========================================
// FORM SUBMISSIONS & BUSINESS ACTIONS
// ==========================================

// Form: Deploy Machine
document.getElementById('form-add-machine').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('machine-name-input').value.trim();
  const location = document.getElementById('machine-location-input').value.trim();
  const rows = parseInt(document.getElementById('machine-rows-input').value);
  const cols = parseInt(document.getElementById('machine-cols-input').value);

  const res = store.addMachine(name, location, rows, cols);
  if (res.success) {
    showToast('Success!', res.message, 'success');
    closeDrawer('drawer-add-machine');
    document.getElementById('form-add-machine').reset();
    switchView('machines');
  } else {
    showToast('Failed to Deploy', res.message, 'error');
  }
});

// Form: Register Product
document.getElementById('form-add-product').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('product-name-input').value.trim();
  const category = document.getElementById('product-category-select').value;
  const sku = document.getElementById('product-sku-input').value.trim();
  const cost = parseFloat(document.getElementById('product-cost-input').value);
  const price = parseFloat(document.getElementById('product-price-input').value);
  const qty = parseInt(document.getElementById('product-stock-input').value) || 0;

  const res = store.addProduct(name, category, cost, price, qty, sku);
  if (res.success) {
    showToast('Registered!', res.message, 'success');
    closeDrawer('drawer-add-product');
    document.getElementById('form-add-product').reset();
    refreshUI();
  } else {
    showToast('Failed to Save', res.message, 'error');
  }
});

// Form: Purchase Stock Expense calculator
const buyQtyInput = document.getElementById('buy-stock-qty-input');
buyQtyInput.addEventListener('input', () => {
  const qty = parseInt(buyQtyInput.value) || 0;
  const prodId = document.getElementById('buy-stock-product-id').value;
  const prod = store.getProducts().find(p => p.id === prodId);
  if (prod) {
    const totalCost = prod.cost * qty;
    document.getElementById('buy-stock-estimate-cost').textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCost);
  }
});

// Form: Purchase Stock Submit
document.getElementById('form-buy-stock').addEventListener('submit', (e) => {
  e.preventDefault();
  const productId = document.getElementById('buy-stock-product-id').value;
  const qty = parseInt(buyQtyInput.value) || 0;

  const res = store.addWarehouseStock(productId, qty);
  if (res.success) {
    showToast('Acquired!', res.message, 'success');
    closeDrawer('drawer-buy-stock');
    refreshUI();
  } else {
    showToast('Purchase Failed', res.message, 'error');
  }
});

// Form: Configure Coil Settings
document.getElementById('form-config-coil').addEventListener('submit', (e) => {
  e.preventDefault();
  const coilId = document.getElementById('config-coil-id').value;
  const productId = document.getElementById('config-coil-product-select').value;
  const price = parseFloat(document.getElementById('config-coil-price-input').value);
  const maxCap = parseInt(document.getElementById('config-coil-capacity-input').value);

  const res = store.editCoil(activeMachineId, coilId, productId, price, maxCap);
  if (res.success) {
    showToast('Configured!', res.message, 'success');
    closeDrawer('drawer-config-coil');
    refreshUI();
  } else {
    showToast('Adjustment Failed', res.message, 'error');
  }
});

// Form: Restock Coil Submit
document.getElementById('form-restock-coil').addEventListener('submit', (e) => {
  e.preventDefault();
  const coilId = document.getElementById('restock-coil-id').value;
  const amount = parseInt(document.getElementById('restock-coil-amount-input').value);

  const res = store.restockCoil(activeMachineId, coilId, amount);
  if (res.success) {
    showToast('Restocked!', res.message, 'success');
    closeDrawer('drawer-restock-coil');
    refreshUI();
  } else {
    showToast('Restocking Failed', res.message, 'error');
  }
});

// Smart Restock All Coils inside details
document.getElementById('btn-restock-machine-all').addEventListener('click', () => {
  if (!activeMachineId) return;
  const res = store.restockMachineAll(activeMachineId);
  if (res.success) {
    showToast('Refilled!', res.message, 'success');
    refreshUI();
  } else {
    showToast('Restocking Run Skipped', res.message, 'warning');
  }
});

// ==========================================
// DELEGATED EVENT LISTENERS
// ==========================================

// Drawer open/close triggers
document.getElementById('btn-add-machine-trigger').addEventListener('click', () => openDrawer('drawer-add-machine'));
document.getElementById('btn-add-product-trigger').addEventListener('click', () => openDrawer('drawer-add-product'));

document.querySelectorAll('[data-close-drawer]').forEach(btn => {
  btn.addEventListener('click', closeAllDrawers);
});

// View switching
document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const view = item.getAttribute('data-view');
    switchView(view);
    closeMobileSidebar();
  });
});

// Switch to machine detail view from cards grid
document.getElementById('machines-grid-container').addEventListener('click', (e) => {
  const card = e.target.closest('.machine-card');
  if (card) {
    const machId = card.getAttribute('data-machine-id');
    activeMachineId = machId;
    switchView('machine-detail');
  }
});

// Back from Machine Detail view
document.getElementById('btn-back-to-machines').addEventListener('click', () => {
  activeMachineId = null;
  switchView('machines');
});

// Interactive Coil Cell button clicks (Sell, Restock, Edit Coil)
document.getElementById('cabinet-coils-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('.coil-action-btn');
  if (!btn) return;

  const action = btn.getAttribute('data-action');
  const coilId = btn.getAttribute('data-coil');
  const machine = store.getMachine(activeMachineId);
  if (!machine) return;

  const coil = machine.coils.find(c => c.coilId === coilId);
  if (!coil) return;

  if (action === 'sell') {
    const res = store.logSale(activeMachineId, coilId);
    if (res.success) {
      showToast('Sale Tracked', res.message, 'success');
      refreshUI();
    } else {
      showToast('Error', res.message, 'error');
    }
  } 
  
  else if (action === 'restock') {
    const prod = store.getProducts().find(p => p.id === coil.productId);
    if (!prod) return;

    // Open single coil Restock drawer
    document.getElementById('restock-coil-id').value = coilId;
    document.getElementById('restock-coil-title-badge').textContent = coilId;
    document.getElementById('restock-coil-product-name').value = prod.name;
    document.getElementById('restock-coil-current-qty').textContent = `${coil.qty} / ${coil.maxCapacity}`;
    document.getElementById('restock-coil-warehouse-qty').textContent = `${prod.stock} unit(s)`;
    
    // Set suggestions
    const spaceLeft = coil.maxCapacity - coil.qty;
    const maxTransfer = Math.min(spaceLeft, prod.stock);
    const amountInput = document.getElementById('restock-coil-amount-input');
    
    amountInput.value = maxTransfer;
    amountInput.max = maxTransfer;
    amountInput.min = 1;
    
    document.getElementById('restock-coil-info-hint').textContent = `Fills empty slots up to capacity (${maxTransfer} needed based on warehouse stock).`;
    
    const submitBtn = document.getElementById('btn-restock-submit');
    if (maxTransfer === 0) {
      submitBtn.disabled = true;
      amountInput.disabled = true;
      if (prod.stock === 0) {
        document.getElementById('restock-coil-info-hint').innerHTML = `<span style="color: var(--color-danger)">Warehouse is completely empty of this product! Please purchase warehouse stock.</span>`;
      } else {
        document.getElementById('restock-coil-info-hint').textContent = `Slot coil is already at maximum capacity.`;
      }
    } else {
      submitBtn.disabled = false;
      amountInput.disabled = false;
    }

    openDrawer('drawer-restock-coil');
  } 
  
  else if (action === 'edit') {
    // Populate select lists
    const prodSelect = document.getElementById('config-coil-product-select');
    const products = store.getProducts();

    prodSelect.innerHTML = `<option value="">-- Leave Slot Unassigned --</option>` + 
      products.map(p => `<option value="${p.id}">${p.name} (${p.category})</option>`).join('');

    // Pre-populate fields
    document.getElementById('config-coil-id').value = coilId;
    document.getElementById('config-coil-title-badge').textContent = coilId;
    prodSelect.value = coil.productId;
    document.getElementById('config-coil-price-input').value = coil.price;
    document.getElementById('config-coil-capacity-input').value = coil.maxCapacity;

    openDrawer('drawer-config-coil');
  }
});

// Warehouse Catalog table action buttons (Buy Stock)
document.getElementById('catalog-table-body').addEventListener('click', (e) => {
  const btn = e.target.closest('.table-action-btn');
  if (!btn) return;

  const action = btn.getAttribute('data-action');
  const productId = btn.getAttribute('data-product-id');
  const prod = store.getProducts().find(p => p.id === productId);
  if (!prod) return;

  if (action === 'buy-stock') {
    document.getElementById('buy-stock-product-id').value = productId;
    document.getElementById('buy-stock-product-name').value = prod.name;
    document.getElementById('buy-stock-qty-input').value = 50;
    document.getElementById('buy-stock-estimate-cost').textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(prod.cost * 50);
    openDrawer('drawer-buy-stock');
  }
});

// Realtime Warehouse search & filter events
document.getElementById('catalog-search-input').addEventListener('input', refreshUI);
document.getElementById('catalog-category-filter').addEventListener('change', refreshUI);

// Realtime Transaction search & filter events
document.getElementById('logs-search-input').addEventListener('input', refreshUI);
document.getElementById('logs-type-filter').addEventListener('change', refreshUI);

// ==========================================
// STARTUP INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Mobile Collapsible Sidebar bindings
  const toggleBtn = document.getElementById('btn-mobile-toggle');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleMobileSidebar);
  }
  if (backdrop) {
    backdrop.addEventListener('click', closeMobileSidebar);
  }

  // Pre-seed render
  refreshUI();
});
