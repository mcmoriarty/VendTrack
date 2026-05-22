/**
 * store.js - Core State Store for VendTrack
 * Manages local storage persistent state, mock demo seeding, and core business mutations.
 */

const STORAGE_KEY = 'vendtrack_state_v1';

// Default mock products
const DEFAULT_PRODUCTS = [
  { id: 'prod-cola', name: 'Classic Cola', category: 'Drink', cost: 0.45, price: 1.50, stock: 120, sku: 'DRK-COLA-12' },
  { id: 'prod-monster', name: 'Monster Energy', category: 'Drink', cost: 1.10, price: 3.00, stock: 45, sku: 'DRK-MSTR-16' },
  { id: 'prod-water', name: 'Coconut Water', category: 'Drink', cost: 0.85, price: 2.25, stock: 60, sku: 'DRK-COCO-11' },
  { id: 'prod-snickers', name: 'Snickers Bar', category: 'Candy', cost: 0.35, price: 1.25, stock: 80, sku: 'SNC-SNIK-02' },
  { id: 'prod-lays', name: 'Baked Lays BBQ', category: 'Snack', cost: 0.40, price: 1.50, stock: 50, sku: 'SNK-LAYS-BBQ' },
  { id: 'prod-protein', name: 'Quest Protein Bar', category: 'Snack', cost: 1.20, price: 3.50, stock: 35, sku: 'SNK-QST-PRO' },
  { id: 'prod-skittles', name: 'Skittles Sour', category: 'Candy', cost: 0.35, price: 1.25, stock: 75, sku: 'SNC-SKIT-SR' },
  { id: 'prod-tea', name: 'Arizona Iced Tea', category: 'Drink', cost: 0.50, price: 1.75, stock: 90, sku: 'DRK-ARIZ-TEA' },
];

// Helper to generate a 7-day transaction history to make the graphs look stunning
function generateMockTransactions(products) {
  const transactions = [];
  const now = new Date();
  
  // Create sales over the past 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    
    // Number of sales on this day (randomized but realistic)
    const salesCount = 12 + Math.floor(Math.random() * 15);
    
    for (let j = 0; j < salesCount; j++) {
      const prod = products[Math.floor(Math.random() * products.length)];
      // Set timestamp spaced throughout the day
      const saleTime = new Date(date);
      saleTime.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
      
      transactions.push({
        id: `tx-${Math.random().toString(36).substr(2, 9)}`,
        type: 'sale',
        productId: prod.id,
        productName: prod.name,
        cost: prod.cost,
        price: prod.price,
        profit: Number((prod.price - prod.cost).toFixed(2)),
        machineName: ['Lobby Combo Max', 'Tech Campus Breakroom', 'Active Gym Drinks'][Math.floor(Math.random() * 3)],
        timestamp: saleTime.toISOString()
      });
    }

    // Add a few warehouse restocks
    if (i === 5 || i === 2) {
      const prod = products[Math.floor(Math.random() * products.length)];
      const restockTime = new Date(date);
      restockTime.setHours(6, 0);
      
      transactions.push({
        id: `tx-restock-${Math.random().toString(36).substr(2, 9)}`,
        type: 'wh_restock',
        productId: prod.id,
        productName: prod.name,
        qty: 50,
        cost: Number((prod.cost * 50).toFixed(2)),
        machineName: 'Warehouse',
        timestamp: restockTime.toISOString()
      });
    }
  }

  // Sort transactions by date descending
  return transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Default mock machines
function generateMockMachines(products) {
  return [
    {
      id: 'mach-lobby',
      name: 'Lobby Combo Max',
      location: 'Main Office - Building A Lobby',
      rows: 4,
      cols: 4,
      status: 'active',
      coils: [
        { coilId: 'A1', productId: 'prod-cola', price: 1.50, qty: 8, maxCapacity: 10 },
        { coilId: 'A2', productId: 'prod-tea', price: 1.75, qty: 9, maxCapacity: 10 },
        { coilId: 'A3', productId: 'prod-water', price: 2.25, qty: 3, maxCapacity: 10 },
        { coilId: 'A4', productId: 'prod-monster', price: 3.00, qty: 6, maxCapacity: 8 },
        
        { coilId: 'B1', productId: 'prod-lays', price: 1.50, qty: 7, maxCapacity: 10 },
        { coilId: 'B2', productId: 'prod-lays', price: 1.50, qty: 2, maxCapacity: 10 }, // low stock
        { coilId: 'B3', productId: 'prod-protein', price: 3.50, qty: 1, maxCapacity: 8 }, // very low
        { coilId: 'B4', productId: 'prod-snickers', price: 1.25, qty: 10, maxCapacity: 12 },
        
        { coilId: 'C1', productId: 'prod-skittles', price: 1.25, qty: 8, maxCapacity: 12 },
        { coilId: 'C2', productId: 'prod-snickers', price: 1.25, qty: 0, maxCapacity: 12 }, // empty
        { coilId: 'C3', productId: 'prod-cola', price: 1.50, qty: 5, maxCapacity: 10 },
        { coilId: 'C4', productId: 'prod-tea', price: 1.75, qty: 7, maxCapacity: 10 },
        
        { coilId: 'D1', productId: 'prod-water', price: 2.25, qty: 8, maxCapacity: 10 },
        { coilId: 'D2', productId: 'prod-monster', price: 3.00, qty: 7, maxCapacity: 8 },
        { coilId: 'D3', productId: 'prod-protein', price: 3.50, qty: 5, maxCapacity: 8 },
        { coilId: 'D4', productId: 'prod-skittles', price: 1.25, qty: 9, maxCapacity: 12 },
      ]
    },
    {
      id: 'mach-breakroom',
      name: 'Tech Campus Breakroom',
      location: 'Floor 3 - Engineering Hub',
      rows: 3,
      cols: 4,
      status: 'active',
      coils: [
        { coilId: 'A1', productId: 'prod-monster', price: 3.00, qty: 8, maxCapacity: 8 },
        { coilId: 'A2', productId: 'prod-monster', price: 3.00, qty: 7, maxCapacity: 8 },
        { coilId: 'A3', productId: 'prod-cola', price: 1.50, qty: 10, maxCapacity: 10 },
        { coilId: 'A4', productId: 'prod-tea', price: 1.75, qty: 4, maxCapacity: 10 },
        
        { coilId: 'B1', productId: 'prod-protein', price: 3.50, qty: 8, maxCapacity: 8 },
        { coilId: 'B2', productId: 'prod-protein', price: 3.50, qty: 7, maxCapacity: 8 },
        { coilId: 'B3', productId: 'prod-lays', price: 1.50, qty: 9, maxCapacity: 10 },
        { coilId: 'B4', productId: 'prod-snickers', price: 1.25, qty: 11, maxCapacity: 12 },
        
        { coilId: 'C1', productId: 'prod-skittles', price: 1.25, qty: 5, maxCapacity: 12 },
        { coilId: 'C2', productId: 'prod-water', price: 2.25, qty: 2, maxCapacity: 10 }, // low stock
        { coilId: 'C3', productId: 'prod-cola', price: 1.50, qty: 9, maxCapacity: 10 },
        { coilId: 'C4', productId: 'prod-tea', price: 1.75, qty: 8, maxCapacity: 10 },
      ]
    },
    {
      id: 'mach-gym',
      name: 'Active Gym Drinks',
      location: 'Gym Center - Main Locker Entry',
      rows: 2,
      cols: 4,
      status: 'warning',
      coils: [
        { coilId: 'A1', productId: 'prod-water', price: 2.25, qty: 1, maxCapacity: 12 }, // critical low
        { coilId: 'A2', productId: 'prod-water', price: 2.25, qty: 2, maxCapacity: 12 }, // critical low
        { coilId: 'A3', productId: 'prod-monster', price: 3.00, qty: 8, maxCapacity: 8 },
        { coilId: 'A4', productId: 'prod-monster', price: 3.00, qty: 6, maxCapacity: 8 },
        
        { coilId: 'B1', productId: 'prod-protein', price: 3.50, qty: 2, maxCapacity: 10 }, // low
        { coilId: 'B2', productId: 'prod-protein', price: 3.50, qty: 3, maxCapacity: 10 }, // low
        { coilId: 'B3', productId: 'prod-tea', price: 1.75, qty: 10, maxCapacity: 10 },
        { coilId: 'B4', productId: 'prod-water', price: 2.25, qty: 11, maxCapacity: 12 },
      ]
    }
  ];
}

export class StateStore {
  constructor() {
    this.state = this.loadState();
  }

  loadState() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        return JSON.parse(serialized);
      }
    } catch (e) {
      console.error('Failed to read from localStorage:', e);
    }
    
    // Seed initial database
    const initialProducts = DEFAULT_PRODUCTS;
    const initialMachines = generateMockMachines(initialProducts);
    const initialTransactions = generateMockTransactions(initialProducts);

    const seededState = {
      products: initialProducts,
      machines: initialMachines,
      transactions: initialTransactions,
    };
    
    this.saveState(seededState);
    return seededState;
  }

  saveState(customState = null) {
    const stateToSave = customState || this.state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to write to localStorage:', e);
    }
  }

  // --- GETTERS ---
  getProducts() {
    return this.state.products;
  }

  getMachines() {
    return this.state.machines;
  }

  getMachine(id) {
    return this.state.machines.find(m => m.id === id);
  }

  getTransactions() {
    return this.state.transactions;
  }

  // --- CALCULATION HELPERS FOR DASHBOARD ---
  getFinancialSummary() {
    const txs = this.state.transactions.filter(t => t.type === 'sale');
    
    const revenue = txs.reduce((acc, curr) => acc + curr.price, 0);
    const cost = txs.reduce((acc, curr) => acc + curr.cost, 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      revenue: Number(revenue.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      margin: Number(margin.toFixed(1))
    };
  }

  getHealthSummary() {
    let totalQty = 0;
    let totalCapacity = 0;
    let lowCount = 0;

    this.state.machines.forEach(m => {
      m.coils.forEach(c => {
        totalQty += c.qty;
        totalCapacity += c.maxCapacity;
        if (c.qty / c.maxCapacity <= 0.25) {
          lowCount++;
        }
      });
    });

    const stockHealth = totalCapacity > 0 ? (totalQty / totalCapacity) * 100 : 0;

    return {
      stockHealth: Number(stockHealth.toFixed(1)),
      lowCount,
      totalQty,
      totalCapacity
    };
  }

  getLowStockCoils() {
    const lowCoils = [];
    this.state.machines.forEach(m => {
      m.coils.forEach(c => {
        const ratio = c.qty / c.maxCapacity;
        if (ratio <= 0.25) {
          const prod = this.state.products.find(p => p.id === c.productId);
          lowCoils.push({
            machineId: m.id,
            machineName: m.name,
            coilId: c.coilId,
            productName: prod ? prod.name : 'Unknown Product',
            qty: c.qty,
            maxCapacity: c.maxCapacity,
            ratio: ratio
          });
        }
      });
    });
    // Sort critical first
    return lowCoils.sort((a, b) => a.ratio - b.ratio);
  }

  // --- MUTATIONS ---
  
  /**
   * Log a sale on a machine's coil slot.
   */
  logSale(machineId, coilId) {
    const machine = this.getMachine(machineId);
    if (!machine) return { success: false, message: 'Machine not found' };

    const coil = machine.coils.find(c => c.coilId === coilId);
    if (!coil) return { success: false, message: 'Coil slot not found' };

    if (coil.qty <= 0) {
      return { success: false, message: 'Item is out of stock in this coil!' };
    }

    const prod = this.state.products.find(p => p.id === coil.productId);
    if (!prod) return { success: false, message: 'Product configuration not found' };

    // Deduct stock from machine coil
    coil.qty--;

    // Create a transaction record
    const saleTransaction = {
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      type: 'sale',
      productId: prod.id,
      productName: prod.name,
      cost: coil.qty === 0 ? prod.cost : prod.cost, // base cost
      price: coil.price,
      profit: Number((coil.price - prod.cost).toFixed(2)),
      machineName: machine.name,
      timestamp: new Date().toISOString()
    };

    this.state.transactions.unshift(saleTransaction);
    this.updateMachineStatus(machine);
    this.saveState();

    return { 
      success: true, 
      message: `Sale logged! 1 ${prod.name} vended.`,
      transaction: saleTransaction 
    };
  }

  /**
   * Restock a single coil in a machine using warehouse inventory.
   */
  restockCoil(machineId, coilId, fillQuantity) {
    const machine = this.getMachine(machineId);
    if (!machine) return { success: false, message: 'Machine not found' };

    const coil = machine.coils.find(c => c.coilId === coilId);
    if (!coil) return { success: false, message: 'Coil slot not found' };

    const prod = this.state.products.find(p => p.id === coil.productId);
    if (!prod) return { success: false, message: 'No product is assigned to this coil' };

    // Max quantity we can actually load into this slot
    const spaceAvailable = coil.maxCapacity - coil.qty;
    if (spaceAvailable <= 0) {
      return { success: false, message: 'Coil is already at maximum capacity.' };
    }

    // Amount to actually transfer
    const transferQty = Math.min(fillQuantity, spaceAvailable);

    if (transferQty <= 0) {
      return { success: false, message: 'Refill amount must be greater than zero.' };
    }

    // Verify warehouse stock
    if (prod.stock < transferQty) {
      return { 
        success: false, 
        message: `Insufficient warehouse stock. Only ${prod.stock} ${prod.name} available in warehouse.` 
      };
    }

    // Transact stock
    prod.stock -= transferQty;
    coil.qty += transferQty;

    // Log transaction
    const restockTransaction = {
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      type: 'restock',
      productId: prod.id,
      productName: prod.name,
      qty: transferQty,
      machineName: machine.name,
      timestamp: new Date().toISOString()
    };

    this.state.transactions.unshift(restockTransaction);
    this.updateMachineStatus(machine);
    this.saveState();

    return { 
      success: true, 
      message: `Refilled ${transferQty} unit(s) of ${prod.name} into coil ${coilId}.`
    };
  }

  /**
   * Refill all low stock coils in a machine using warehouse stock.
   */
  restockMachineAll(machineId) {
    const machine = this.getMachine(machineId);
    if (!machine) return { success: false, message: 'Machine not found' };

    let totalRestocked = 0;
    const restockedProducts = [];
    const missingWarehouseStock = [];

    machine.coils.forEach(coil => {
      const spaceAvailable = coil.maxCapacity - coil.qty;
      if (spaceAvailable > 0 && coil.productId) {
        const prod = this.state.products.find(p => p.id === coil.productId);
        if (prod) {
          // Determine how many we can fill based on warehouse stock
          const fillQty = Math.min(spaceAvailable, prod.stock);
          if (fillQty > 0) {
            prod.stock -= fillQty;
            coil.qty += fillQty;
            totalRestocked += fillQty;

            restockedProducts.push({
              name: prod.name,
              qty: fillQty
            });

            // Log individual transactions
            this.state.transactions.unshift({
              id: `tx-${Math.random().toString(36).substr(2, 9)}`,
              type: 'restock',
              productId: prod.id,
              productName: prod.name,
              qty: fillQty,
              machineName: machine.name,
              timestamp: new Date().toISOString()
            });
          }
          
          if (fillQty < spaceAvailable) {
            missingWarehouseStock.push(prod.name);
          }
        }
      }
    });

    if (totalRestocked === 0) {
      return { 
        success: false, 
        message: 'No restocking was performed. Machine is either full or warehouse is empty.' 
      };
    }

    this.updateMachineStatus(machine);
    this.saveState();

    let feedbackMessage = `Restocked ${totalRestocked} total items!`;
    if (missingWarehouseStock.length > 0) {
      feedbackMessage += ` Some slots under-filled due to low warehouse levels: ${[...new Set(missingWarehouseStock)].join(', ')}.`;
    }

    return {
      success: true,
      message: feedbackMessage,
      details: restockedProducts
    };
  }

  /**
   * Buy more stock for the warehouse inventory.
   */
  addWarehouseStock(productId, qty) {
    const prod = this.state.products.find(p => p.id === productId);
    if (!prod) return { success: false, message: 'Product not found' };

    prod.stock += qty;

    const restockTransaction = {
      id: `tx-restock-${Math.random().toString(36).substr(2, 9)}`,
      type: 'wh_restock',
      productId: prod.id,
      productName: prod.name,
      qty: qty,
      cost: Number((prod.cost * qty).toFixed(2)),
      machineName: 'Warehouse',
      timestamp: new Date().toISOString()
    };

    this.state.transactions.unshift(restockTransaction);
    this.saveState();

    return {
      success: true,
      message: `Successfully purchased ${qty} units of ${prod.name} for warehouse storage.`
    };
  }

  /**
   * Add a brand new machine with customizable grid dimensions.
   */
  addMachine(name, location, rows, cols) {
    if (!name || !location) return { success: false, message: 'Name and location are required' };
    if (rows < 1 || rows > 10 || cols < 1 || cols > 10) {
      return { success: false, message: 'Machine grid dimensions must be between 1x1 and 10x10' };
    }

    const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const coils = [];

    // Create default coils (empty layout)
    for (let r = 0; r < rows; r++) {
      const letter = rowLetters[r] || `Z${r}`;
      for (let c = 1; c <= cols; c++) {
        coils.push({
          coilId: `${letter}${c}`,
          productId: '', // Unassigned
          price: 1.50,
          qty: 0,
          maxCapacity: 10
        });
      }
    }

    const newMachine = {
      id: `mach-${Math.random().toString(36).substr(2, 9)}`,
      name,
      location,
      rows: parseInt(rows),
      cols: parseInt(cols),
      status: 'active',
      coils
    };

    this.state.machines.push(newMachine);
    this.saveState();

    return {
      success: true,
      message: `Machine "${name}" created with ${rows}x${cols} grid layout.`,
      machine: newMachine
    };
  }

  /**
   * Add a new product to the master catalog list.
   */
  addProduct(name, category, cost, price, initialStock = 0, sku = '') {
    if (!name || !category || cost === undefined || price === undefined) {
      return { success: false, message: 'Name, category, wholesale cost, and retail price are required.' };
    }

    const finalSku = sku || `CAT-${name.substr(0,3).toUpperCase()}-${Math.floor(100+Math.random()*900)}`;

    const newProduct = {
      id: `prod-${Math.random().toString(36).substr(2, 9)}`,
      name,
      category,
      cost: Number(parseFloat(cost).toFixed(2)),
      price: Number(parseFloat(price).toFixed(2)),
      stock: parseInt(initialStock),
      sku: finalSku
    };

    this.state.products.push(newProduct);

    // If initial stock was provided, log a warehouse transaction
    if (initialStock > 0) {
      this.state.transactions.unshift({
        id: `tx-restock-${Math.random().toString(36).substr(2, 9)}`,
        type: 'wh_restock',
        productId: newProduct.id,
        productName: newProduct.name,
        qty: initialStock,
        cost: Number((newProduct.cost * initialStock).toFixed(2)),
        machineName: 'Warehouse',
        timestamp: new Date().toISOString()
      });
    }

    this.saveState();

    return {
      success: true,
      message: `Product "${name}" successfully registered in catalog.`,
      product: newProduct
    };
  }

  /**
   * Configure coil slots (assign product, change price, adjust capacity).
   */
  editCoil(machineId, coilId, productId, price, maxCapacity) {
    const machine = this.getMachine(machineId);
    if (!machine) return { success: false, message: 'Machine not found' };

    const coil = machine.coils.find(c => c.coilId === coilId);
    if (!coil) return { success: false, message: 'Coil slot not found' };

    coil.productId = productId;
    coil.price = Number(parseFloat(price).toFixed(2));
    coil.maxCapacity = parseInt(maxCapacity);
    
    // Safety clamp quantity to max capacity
    if (coil.qty > coil.maxCapacity) {
      coil.qty = coil.maxCapacity;
    }

    this.updateMachineStatus(machine);
    this.saveState();

    return {
      success: true,
      message: `Coil slot ${coilId} configuration updated.`
    };
  }

  // --- HELPERS ---
  
  /**
   * Recalculates and updates a machine's active state status flag.
   */
  updateMachineStatus(machine) {
    let emptyCoilsCount = 0;
    let criticalCoilsCount = 0;
    
    machine.coils.forEach(c => {
      if (c.qty === 0) {
        emptyCoilsCount++;
      } else if (c.qty / c.maxCapacity <= 0.25) {
        criticalCoilsCount++;
      }
    });

    if (emptyCoilsCount > 0) {
      machine.status = 'warning'; // out of stock coils
    } else if (criticalCoilsCount > 0) {
      machine.status = 'warning';
    } else {
      machine.status = 'active';
    }
  }
}
