const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database/stock_management.db');
const db = new sqlite3.Database(dbPath);

// Produits de quincaillerie et construction
const categories = [
    { name: 'Portes', description: 'Portes en aluminium et bois' },
    { name: 'Sanitaires', description: 'Équipements sanitaires' },
    { name: 'Plomberie', description: 'Accessoires de plomberie' },
    { name: 'Quincaillerie', description: 'Quincaillerie générale' },
    { name: 'Électricité', description: 'Matériel électrique' },
    { name: 'Peinture', description: 'Peintures et accessoires' }
];

const products = [
    // Portes
    { name: 'Porte en Aluminium Simple', category: 'Portes', sku: 'PRT-ALU-001', price: 15000, stock: 10, unit: 'unité', supplier: 'Aluminium Pro' },
    { name: 'Porte en Aluminium Double Vitrage', category: 'Portes', sku: 'PRT-ALU-002', price: 25000, stock: 8, unit: 'unité', supplier: 'Aluminium Pro' },
    { name: 'Porte en Bois Massif', category: 'Portes', sku: 'PRT-BOS-001', price: 18000, stock: 12, unit: 'unité', supplier: 'Bois Elite' },
    { name: 'Porte en Bois Contreplaqué', category: 'Portes', sku: 'PRT-BOS-002', price: 8000, stock: 20, unit: 'unité', supplier: 'Bois Elite' },
    { name: 'Porte Coulissante Aluminium', category: 'Portes', sku: 'PRT-COU-001', price: 30000, stock: 5, unit: 'unité', supplier: 'Aluminium Pro' },
    
    // Sanitaires
    { name: 'Cuvette WC Standard', category: 'Sanitaires', sku: 'SAN-CUV-001', price: 4500, stock: 25, unit: 'unité', supplier: 'Sanitaire Plus' },
    { name: 'Cuvette WC Suspendue', category: 'Sanitaires', sku: 'SAN-CUV-002', price: 8000, stock: 15, unit: 'unité', supplier: 'Sanitaire Plus' },
    { name: 'Douche Complète (Cabine)', category: 'Sanitaires', sku: 'SAN-DOU-001', price: 12000, stock: 8, unit: 'unité', supplier: 'Sanitaire Plus' },
    { name: 'Douchette à Main', category: 'Sanitaires', sku: 'SAN-DOU-002', price: 800, stock: 50, unit: 'unité', supplier: 'Sanitaire Plus' },
    { name: 'Lavabo Simple', category: 'Sanitaires', sku: 'SAN-LAV-001', price: 3000, stock: 20, unit: 'unité', supplier: 'Sanitaire Plus' },
    { name: 'Lavabo Double', category: 'Sanitaires', sku: 'SAN-LAV-002', price: 5500, stock: 10, unit: 'unité', supplier: 'Sanitaire Plus' },
    { name: 'Baignoire Standard', category: 'Sanitaires', sku: 'SAN-BAI-001', price: 15000, stock: 6, unit: 'unité', supplier: 'Sanitaire Plus' },
    
    // Plomberie
    { name: 'Robinet Cuisine Chromé', category: 'Plomberie', sku: 'PLB-ROB-001', price: 2500, stock: 30, unit: 'unité', supplier: 'Plomberie Pro' },
    { name: 'Robinet Salle de Bain', category: 'Plomberie', sku: 'PLB-ROB-002', price: 1800, stock: 40, unit: 'unité', supplier: 'Plomberie Pro' },
    { name: 'Mitigeur Douche', category: 'Plomberie', sku: 'PLB-MIT-001', price: 3200, stock: 25, unit: 'unité', supplier: 'Plomberie Pro' },
    { name: 'Tuyau PVC Ø32mm (barre 3m)', category: 'Plomberie', sku: 'PLB-TUY-001', price: 450, stock: 100, unit: 'barre', supplier: 'Plomberie Pro' },
    { name: 'Tuyau PVC Ø50mm (barre 3m)', category: 'Plomberie', sku: 'PLB-TUY-002', price: 650, stock: 80, unit: 'barre', supplier: 'Plomberie Pro' },
    { name: 'Tuyau PVC Ø100mm (barre 3m)', category: 'Plomberie', sku: 'PLB-TUY-003', price: 1200, stock: 50, unit: 'barre', supplier: 'Plomberie Pro' },
    { name: 'Coude PVC 90° Ø32mm', category: 'Plomberie', sku: 'PLB-COU-001', price: 80, stock: 200, unit: 'pièce', supplier: 'Plomberie Pro' },
    { name: 'Siphon Lavabo', category: 'Plomberie', sku: 'PLB-SIP-001', price: 350, stock: 60, unit: 'unité', supplier: 'Plomberie Pro' },
    
    // Quincaillerie
    { name: 'Poignée de Porte Aluminium', category: 'Quincaillerie', sku: 'QUI-POI-001', price: 600, stock: 80, unit: 'paire', supplier: 'Quincaillerie Central' },
    { name: 'Poignée de Porte Inox', category: 'Quincaillerie', sku: 'QUI-POI-002', price: 1200, stock: 50, unit: 'paire', supplier: 'Quincaillerie Central' },
    { name: 'Serrure Simple', category: 'Quincaillerie', sku: 'QUI-SER-001', price: 800, stock: 40, unit: 'unité', supplier: 'Quincaillerie Central' },
    { name: 'Serrure 3 Points', category: 'Quincaillerie', sku: 'QUI-SER-002', price: 3500, stock: 15, unit: 'unité', supplier: 'Quincaillerie Central' },
    { name: 'Charnière Porte 100mm', category: 'Quincaillerie', sku: 'QUI-CHA-001', price: 150, stock: 200, unit: 'pièce', supplier: 'Quincaillerie Central' },
    { name: 'Verrou de Porte', category: 'Quincaillerie', sku: 'QUI-VER-001', price: 250, stock: 100, unit: 'unité', supplier: 'Quincaillerie Central' },
    { name: 'Vis à Bois 4x40mm (boîte 100pcs)', category: 'Quincaillerie', sku: 'QUI-VIS-001', price: 300, stock: 150, unit: 'boîte', supplier: 'Quincaillerie Central' },
    { name: 'Vis à Métal 5x50mm (boîte 100pcs)', category: 'Quincaillerie', sku: 'QUI-VIS-002', price: 400, stock: 120, unit: 'boîte', supplier: 'Quincaillerie Central' },
    { name: 'Cheville Fischer 8mm (sachet 50pcs)', category: 'Quincaillerie', sku: 'QUI-CHE-001', price: 200, stock: 200, unit: 'sachet', supplier: 'Quincaillerie Central' },
    
    // Électricité
    { name: 'Câble Électrique 1.5mm² (rouleau 100m)', category: 'Électricité', sku: 'ELE-CAB-001', price: 3500, stock: 30, unit: 'rouleau', supplier: 'Électro Plus' },
    { name: 'Câble Électrique 2.5mm² (rouleau 100m)', category: 'Électricité', sku: 'ELE-CAB-002', price: 5500, stock: 25, unit: 'rouleau', supplier: 'Électro Plus' },
    { name: 'Interrupteur Simple', category: 'Électricité', sku: 'ELE-INT-001', price: 180, stock: 150, unit: 'unité', supplier: 'Électro Plus' },
    { name: 'Interrupteur Double', category: 'Électricité', sku: 'ELE-INT-002', price: 280, stock: 100, unit: 'unité', supplier: 'Électro Plus' },
    { name: 'Prise Électrique Simple', category: 'Électricité', sku: 'ELE-PRI-001', price: 150, stock: 200, unit: 'unité', supplier: 'Électro Plus' },
    { name: 'Disjoncteur 16A', category: 'Électricité', sku: 'ELE-DIS-001', price: 800, stock: 60, unit: 'unité', supplier: 'Électro Plus' },
    { name: 'Tableau Électrique 12 Modules', category: 'Électricité', sku: 'ELE-TAB-001', price: 2500, stock: 20, unit: 'unité', supplier: 'Électro Plus' },
    { name: 'Ampoule LED 12W', category: 'Électricité', sku: 'ELE-AMP-001', price: 350, stock: 300, unit: 'unité', supplier: 'Électro Plus' },
    
    // Peinture
    { name: 'Peinture Murale Blanche 20L', category: 'Peinture', sku: 'PEI-MUR-001', price: 4500, stock: 40, unit: 'bidon', supplier: 'Peinture Pro' },
    { name: 'Peinture Murale Couleur 20L', category: 'Peinture', sku: 'PEI-MUR-002', price: 5500, stock: 30, unit: 'bidon', supplier: 'Peinture Pro' },
    { name: 'Peinture Extérieure 20L', category: 'Peinture', sku: 'PEI-EXT-001', price: 7000, stock: 25, unit: 'bidon', supplier: 'Peinture Pro' },
    { name: 'Rouleau de Peinture', category: 'Peinture', sku: 'PEI-ROU-001', price: 250, stock: 100, unit: 'unité', supplier: 'Peinture Pro' },
    { name: 'Pinceau Set (3 pièces)', category: 'Peinture', sku: 'PEI-PIN-001', price: 400, stock: 80, unit: 'set', supplier: 'Peinture Pro' },
    { name: 'Bac à Peinture', category: 'Peinture', sku: 'PEI-BAC-001', price: 150, stock: 120, unit: 'unité', supplier: 'Peinture Pro' }
];

const suppliers = [
    { name: 'Aluminium Pro', contact: 'contact@alupro.dz', phone: '0550123456', address: 'Zone Industrielle, Alger' },
    { name: 'Bois Elite', contact: 'info@boiselite.dz', phone: '0550234567', address: 'Route Nationale, Blida' },
    { name: 'Sanitaire Plus', contact: 'vente@sanitaireplus.dz', phone: '0550345678', address: 'Centre Commercial, Oran' },
    { name: 'Plomberie Pro', contact: 'contact@plomberiepro.dz', phone: '0550456789', address: 'Rue des Artisans, Constantine' },
    { name: 'Quincaillerie Central', contact: 'info@quincaillerie.dz', phone: '0550567890', address: 'Marché Central, Alger' },
    { name: 'Électro Plus', contact: 'vente@electroplus.dz', phone: '0550678901', address: 'Zone Commerciale, Annaba' },
    { name: 'Peinture Pro', contact: 'contact@peinturepro.dz', phone: '0550789012', address: 'Route Industrielle, Sétif' }
];

async function populateDatabase() {
    console.log('🏗️ Début du remplissage de la base de données...\n');

    // Insert suppliers first
    console.log('📦 Ajout des fournisseurs...');
    for (const supplier of suppliers) {
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT OR IGNORE INTO suppliers (name, contact_person, email, phone, address, created_at) 
                 VALUES (?, ?, ?, ?, ?, datetime('now'))`,
                [supplier.name, supplier.name, supplier.contact, supplier.phone, supplier.address],
                (err) => {
                    if (err) reject(err);
                    else {
                        console.log(`  ✅ ${supplier.name}`);
                        resolve();
                    }
                }
            );
        });
    }

    // Insert categories
    console.log('\n📁 Ajout des catégories...');
    const categoryIds = {};
    for (const category of categories) {
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT OR IGNORE INTO categories (name, description, created_at) 
                 VALUES (?, ?, datetime('now'))`,
                [category.name, category.description],
                function(err) {
                    if (err) reject(err);
                    else {
                        db.get('SELECT id FROM categories WHERE name = ?', [category.name], (err, row) => {
                            if (row) categoryIds[category.name] = row.id;
                            console.log(`  ✅ ${category.name}`);
                            resolve();
                        });
                    }
                }
            );
        });
    }

    // Insert products
    console.log('\n🛠️ Ajout des produits...');
    let productCount = 0;
    for (const product of products) {
        const categoryId = categoryIds[product.category];
        
        // Get supplier ID
        const supplier = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM suppliers WHERE name = ?', [product.supplier], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        await new Promise((resolve, reject) => {
            db.run(
                `INSERT OR IGNORE INTO products 
                 (name, sku, category_id, purchase_price, selling_price, stock_quantity, 
                  min_stock_level, unit, supplier_id, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [
                    product.name,
                    product.sku,
                    categoryId,
                    product.price * 0.7, // Prix d'achat (70% du prix de vente)
                    product.price, // Prix de vente
                    product.stock,
                    Math.max(5, Math.floor(product.stock * 0.2)), // Stock minimum
                    product.unit,
                    supplier?.id || null
                ],
                (err) => {
                    if (err) reject(err);
                    else {
                        productCount++;
                        console.log(`  ✅ ${product.name} - ${product.price} DA`);
                        resolve();
                    }
                }
            );
        });
    }

    console.log(`\n✅ Base de données remplie avec succès!`);
    console.log(`   - ${suppliers.length} fournisseurs`);
    console.log(`   - ${categories.length} catégories`);
    console.log(`   - ${productCount} produits`);
    console.log(`\n🎉 Votre système de gestion de stock est prêt!`);
}

// Run the population
populateDatabase()
    .then(() => {
        db.close();
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Erreur:', error);
        db.close();
        process.exit(1);
    });
