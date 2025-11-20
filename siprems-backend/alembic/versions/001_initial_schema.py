"""Initial schema creation

Revision ID: 001_initial_schema
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create initial schema."""
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
                CREATE TYPE event_type AS ENUM ('holiday', 'promotion', 'seasonal', 'custom');
            END IF;
        END
        $$;
        """
    )

    op.create_table(
        "users",
        sa.Column("user_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("user_id"),
        sa.UniqueConstraint("email"),
    )

    op.create_index("idx_users_email", "users", ["email"], unique=False)
    op.create_index("idx_users_created_at", "users", ["created_at"], unique=False)

    op.create_table(
        "products",
        sa.Column("product_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("variation", sa.String(length=100), nullable=True),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("stock", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("sku", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("product_id"),
        sa.UniqueConstraint("sku"),
    )

    op.create_index("idx_products_category", "products", ["category"], unique=False)
    op.create_index("idx_products_sku", "products", ["sku"], unique=False)

    op.create_table(
        "transactions",
        sa.Column("transaction_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity_sold", sa.Integer(), nullable=False),
        sa.Column("price_per_unit", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("transaction_date", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("is_promo", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.product_id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("transaction_id"),
    )

    op.create_index("idx_transaction_date", "transactions", ["transaction_date"], unique=False)
    op.create_index("idx_product_id", "transactions", ["product_id"], unique=False)
    op.create_index(
        "idx_transactions_product_date",
        "transactions",
        ["product_id", "transaction_date"],
        unique=False,
    )
    op.create_index("idx_transactions_is_promo", "transactions", ["is_promo"], unique=False)
    op.create_index(
        "idx_transactions_date_range",
        "transactions",
        [sa.desc("transaction_date")],
        unique=False,
    )
    op.create_index(
        "idx_transactions_quantity_date",
        "transactions",
        ["quantity_sold", "transaction_date"],
        unique=False,
    )

    op.create_table(
        "events",
        sa.Column("event_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_name", sa.String(length=255), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("type", postgresql.ENUM("holiday", "promotion", "seasonal", "custom", name="event_type"), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("include_in_prediction", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.PrimaryKeyConstraint("event_id"),
        sa.UniqueConstraint("event_name", "event_date"),
    )

    op.create_index("idx_events_date", "events", ["event_date"], unique=False)
    op.create_index("idx_events_type", "events", ["type"], unique=False)


def downgrade() -> None:
    """Drop all tables."""
    op.drop_index("idx_events_type", table_name="events")
    op.drop_index("idx_events_date", table_name="events")
    op.drop_table("events")

    op.drop_index("idx_transactions_quantity_date", table_name="transactions")
    op.drop_index("idx_transactions_date_range", table_name="transactions")
    op.drop_index("idx_transactions_is_promo", table_name="transactions")
    op.drop_index("idx_transactions_product_date", table_name="transactions")
    op.drop_index("idx_product_id", table_name="transactions")
    op.drop_index("idx_transaction_date", table_name="transactions")
    op.drop_table("transactions")

    op.drop_index("idx_products_sku", table_name="products")
    op.drop_index("idx_products_category", table_name="products")
    op.drop_table("products")

    op.drop_index("idx_users_created_at", table_name="users")
    op.drop_index("idx_users_email", table_name="users")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS event_type;")
