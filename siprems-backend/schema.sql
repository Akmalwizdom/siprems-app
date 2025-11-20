-- Drop tables if they exist (for testing)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS event_type;

-- User table for authentication
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Enum type for event types
CREATE TYPE event_type AS ENUM ('holiday', 'promotion', 'seasonal', 'custom');

-- Tabel untuk Produk
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

-- Tabel untuk Transaksi / Penjualan
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    quantity_sold INT NOT NULL,
    price_per_unit NUMERIC(10, 2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_promo BOOLEAN DEFAULT FALSE, 
    
    -- Membuat relasi ke tabel products
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
);

-- Tabel untuk Acara & Hari Libur
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
