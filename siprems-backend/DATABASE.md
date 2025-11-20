# Database Guide

## Overview

The Siprems backend uses PostgreSQL as the primary database with SQLAlchemy ORM for object-relational mapping and Alembic for schema migrations.

## Technology Stack

- **Database**: PostgreSQL 12+
- **ORM**: SQLAlchemy 2.0
- **Migrations**: Alembic 1.13+

## Database Schema

### Tables

#### `users`
Stores user accounts and authentication information.

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| email | VARCHAR(255) | UNIQUE, NOT NULL, INDEX |
| full_name | VARCHAR(255) | NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | DEFAULT NOW(), NOT NULL |
| updated_at | TIMESTAMP | DEFAULT NOW(), NOT NULL |

**Indexes**:
- `idx_users_email` - On email for fast lookups
- `idx_users_created_at` - On created_at for filtering

---

#### `products`
Stores product inventory information.

| Column | Type | Constraints |
|--------|------|-------------|
| product_id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| name | VARCHAR(255) | NOT NULL |
| category | VARCHAR(100) | Nullable, INDEX |
| variation | VARCHAR(100) | Nullable |
| price | NUMERIC(10,2) | NOT NULL |
| stock | INTEGER | DEFAULT 0, NOT NULL |
| sku | VARCHAR(100) | UNIQUE, NOT NULL, INDEX |
| created_at | TIMESTAMP | DEFAULT NOW(), NOT NULL |

**Indexes**:
- `idx_products_sku` - On SKU for fast lookups
- `idx_products_category` - On category for filtering

**Relationships**:
- One-to-Many with transactions

---

#### `transactions`
Stores sales transaction records.

| Column | Type | Constraints |
|--------|------|-------------|
| transaction_id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| product_id | INTEGER | FOREIGN KEY (products), NOT NULL |
| quantity_sold | INTEGER | NOT NULL |
| price_per_unit | NUMERIC(10,2) | NOT NULL |
| transaction_date | TIMESTAMP | DEFAULT NOW(), NOT NULL |
| is_promo | BOOLEAN | DEFAULT FALSE |

**Indexes**:
- `idx_transaction_date` - On transaction_date for range queries
- `idx_product_id` - On product_id for joins
- `idx_transactions_product_date` - Composite on product_id, transaction_date
- `idx_transactions_is_promo` - On is_promo for filtering
- `idx_transactions_date_range` - Descending on transaction_date for ordering
- `idx_transactions_quantity_date` - Composite on quantity_sold, transaction_date

**Relationships**:
- Many-to-One with products (RESTRICT on delete)

**Foreign Keys**:
- product_id -> products.product_id (RESTRICT)

---

#### `events`
Stores holiday and special event information.

| Column | Type | Constraints |
|--------|------|-------------|
| event_id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| event_name | VARCHAR(255) | NOT NULL |
| event_date | DATE | NOT NULL |
| type | ENUM | ('holiday', 'promotion', 'seasonal', 'custom'), NOT NULL |
| description | TEXT | Nullable |
| include_in_prediction | BOOLEAN | DEFAULT TRUE |

**Constraints**:
- UNIQUE(event_name, event_date)

**Indexes**:
- `idx_events_date` - On event_date for filtering
- `idx_events_type` - On type for filtering

---

## Database Connection

### Configuration

Database connection is configured through environment variables:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=siprems_db
DB_USER=postgres
DB_PASSWORD=your_password
```

### Connection Pool

SQLAlchemy uses a connection pool with the following settings:

```python
pool_size=10           # Number of connections to maintain
max_overflow=20        # Additional connections beyond pool_size
pool_pre_ping=True     # Verify connections before using
```

## Migrations

### What is Alembic?

Alembic is a database migration tool that manages schema changes over time. It allows you to:

- Create database schema automatically from models
- Track schema changes in version control
- Apply/rollback changes in a controlled manner
- Migrate production databases safely

### Migration Workflow

1. **Create a migration**
   ```bash
   alembic revision --autogenerate -m "Description of changes"
   ```

2. **Review the migration**
   ```bash
   # Check the generated file in alembic/versions/
   ```

3. **Apply the migration**
   ```bash
   alembic upgrade head
   ```

### Common Alembic Commands

```bash
# Create new migration
alembic revision --autogenerate -m "Add user_role column"

# See migration history
alembic history

# Current version
alembic current

# Upgrade to latest
alembic upgrade head

# Upgrade to specific version
alembic upgrade ae1027a6acf

# Rollback one step
alembic downgrade -1

# Rollback to specific version
alembic downgrade 1975ea83156

# See SQL for upgrade
alembic upgrade head --sql

# Downgrade and show SQL
alembic downgrade -1 --sql
```

### Writing Custom Migrations

Edit the migration file in `alembic/versions/`:

```python
def upgrade() -> None:
    """Apply migration."""
    op.add_column('products', sa.Column('new_field', sa.String(100)))
    op.create_index('idx_new_field', 'products', ['new_field'])

def downgrade() -> None:
    """Rollback migration."""
    op.drop_index('idx_new_field', table_name='products')
    op.drop_column('products', 'new_field')
```

## Initialization

### Initial Setup

1. **Create database**
   ```bash
   createdb siprems_db
   ```

2. **Create PostgreSQL user** (if needed)
   ```bash
   createuser postgres
   ```

3. **Initialize migrations**
   ```bash
   make db-init
   ```

   This runs: `alembic upgrade head`

### Seed Data

To populate initial data:

```bash
python seed.py
```

## Performance Optimization

### Indexes

All important lookup columns have indexes:
- Email lookups on users
- SKU lookups on products
- Product ID lookups on transactions
- Date range queries on transactions

### Query Optimization

When using SQLAlchemy:

```python
# Good: Single query with join
transactions = (
    session.query(Transaction)
    .join(Product)
    .filter(Product.category == "Electronics")
    .all()
)

# Avoid: N+1 queries
products = session.query(Product).all()
for product in products:
    transactions = session.query(Transaction).filter_by(product_id=product.id).all()
```

### Pagination

Always paginate large result sets:

```python
products = (
    session.query(Product)
    .limit(50)
    .offset(page * 50)
    .all()
)
```

## Backup and Recovery

### Backup Database

```bash
# Full backup
pg_dump siprems_db > backup.sql

# Binary backup (faster for large databases)
pg_dump --format=custom siprems_db > backup.dump
```

### Restore Database

```bash
# From SQL backup
psql siprems_db < backup.sql

# From binary backup
pg_restore -d siprems_db backup.dump
```

### Point-in-Time Recovery

PostgreSQL supports PITR with WAL (Write-Ahead Logging):

1. Enable WAL archiving in `postgresql.conf`
2. Archive WAL files to external storage
3. On recovery: restore full backup + apply WAL files

## Data Types

### Column Datatypes Used

| Type | Usage | Example |
|------|-------|---------|
| INTEGER | IDs, counts, stock | product_id, quantity_sold |
| VARCHAR(n) | Short strings | names, categories, SKU |
| TEXT | Long strings | descriptions |
| NUMERIC(10,2) | Prices, money | price, price_per_unit |
| BOOLEAN | Flags | is_active, is_promo |
| DATE | Dates | event_date |
| TIMESTAMP | Date and time | created_at, transaction_date |
| ENUM | Fixed options | event_type |

## Monitoring

### Check Database Size

```sql
SELECT pg_size_pretty(pg_database_size('siprems_db'));
```

### Check Table Sizes

```sql
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size('"'||table_name||'"')) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size('"'||table_name||'"') DESC;
```

### Active Connections

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'siprems_db';
```

### Slow Queries

Enable slow query logging in PostgreSQL:

```sql
ALTER DATABASE siprems_db SET log_min_duration_statement = 1000; -- 1 second
```

## Maintenance

### Vacuum

Reclaim space from deleted rows:

```bash
vacuumdb siprems_db
```

### Analyze

Update table statistics:

```bash
analyzedb siprems_db
```

### Reindex

Rebuild indexes:

```bash
reindexdb siprems_db
```

## Disaster Recovery Plan

1. **Detection**: Monitor alerts for database issues
2. **Backup Check**: Verify recent backups exist
3. **Restore**: Use most recent backup
4. **Validation**: Check data integrity
5. **Resume Operations**: Resume serving traffic

## Best Practices

1. **Always write migrations for schema changes**
   - Never manually alter production schema

2. **Test migrations locally first**
   - Verify up and down migrations work

3. **Include meaningful migration messages**
   ```bash
   alembic revision --autogenerate -m "Add payment_method to transactions"
   ```

4. **Regular backups**
   - Daily backups to external storage
   - Test restores periodically

5. **Monitor performance**
   - Track query performance
   - Monitor connection pool usage

6. **Use transactions carefully**
   - SQLAlchemy handles this automatically
   - Manual transactions for complex operations

## Troubleshooting

### Cannot Connect to Database

```bash
# Check PostgreSQL is running
psql -U postgres -d postgres

# Check connection parameters in .env
echo $DB_HOST $DB_PORT $DB_NAME
```

### Migration Fails

1. Check error message in migration file
2. Verify database state: `alembic current`
3. Manually inspect the database
4. Downgrade if needed: `alembic downgrade -1`

### Duplicate Key Error

```
ERROR: duplicate key value violates unique constraint
```

Check for duplicate data before applying constraint:

```sql
SELECT column, COUNT(*) FROM table GROUP BY column HAVING COUNT(*) > 1;
```

### Connection Pool Exhausted

Increase pool settings in configuration:

```python
pool_size=20          # Increase from 10
max_overflow=40       # Increase from 20
```

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/orm/)
- [Alembic Migrations](https://alembic.sqlalchemy.org/)
- [Database Indexing](https://use-the-index-luke.com/)
