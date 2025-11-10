-- Hapus tabel jika sudah ada (untuk testing ulang)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS events;
DROP TYPE IF EXISTS event_type;

-- Tipe kustom untuk 'holiday' atau 'custom'
CREATE TYPE event_type AS ENUM ('holiday', 'custom');

-- Tabel untuk Produk (dari ProductsPage.tsx)
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    variation VARCHAR(100),
    price NUMERIC(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    sku VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel untuk Transaksi / Penjualan (dari TransactionsPage.tsx)
-- Ini adalah data INTI untuk model Prophet
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    quantity_sold INT NOT NULL,
    price_per_unit NUMERIC(10, 2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Membuat relasi ke tabel products
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
);

-- Tabel untuk Acara & Hari Libur (dari CalendarPage.tsx & flowchart)
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    type event_type NOT NULL,
    description TEXT,
    include_in_prediction BOOLEAN DEFAULT TRUE,
    
    UNIQUE(event_name, event_date)
);

-- Membuat index pada tanggal transaksi untuk mempercepat query
CREATE INDEX idx_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_product_id ON transactions(product_id);