import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from utils.config import get_config

config = get_config()

def get_db_connection():
    """Get a database connection with current configuration"""
    conn = psycopg2.connect(
        host=config.DB_HOST,
        database=config.DB_NAME,
        user=config.DB_USER,
        password=config.DB_PASSWORD
    )
    return conn

@contextmanager
def get_db_cursor(commit=True):
    """Context manager for database operations"""
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        yield cur
        if commit:
            conn.commit()
    except Exception as e:
        if commit:
            conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()

def db_query(query, params=None, fetch_all=True, commit=False):
    """
    Execute a database query and return results.
    
    Args:
        query: SQL query string
        params: Query parameters tuple
        fetch_all: If True, fetch all rows; if False, fetch one row
        commit: If True, commit the transaction
    
    Returns:
        List of dicts (if fetch_all=True) or single dict (if fetch_all=False)
    
    Raises:
        Exception: Database error
    """
    with get_db_cursor(commit=commit) as cur:
        try:
            if params:
                cur.execute(query, params)
            else:
                cur.execute(query)
            
            if fetch_all:
                result = cur.fetchall()
                return [dict(row) for row in result]
            else:
                result = cur.fetchone()
                return dict(result) if result else None
        except Exception as e:
            raise e

def db_execute(query, params=None):
    """
    Execute a query that modifies data (INSERT, UPDATE, DELETE).
    Always commits the transaction.
    
    Args:
        query: SQL query string
        params: Query parameters tuple
    
    Returns:
        Result from fetchone() or None
    
    Raises:
        Exception: Database error
    """
    with get_db_cursor(commit=True) as cur:
        try:
            if params:
                cur.execute(query, params)
            else:
                cur.execute(query)
            
            result = cur.fetchone()
            return dict(result) if result else None
        except Exception as e:
            raise e
