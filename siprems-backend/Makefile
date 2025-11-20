.PHONY: help install format lint test test-cov clean install-hooks

help:
	@echo "Available commands:"
	@echo "  make install          - Install dependencies"
	@echo "  make install-hooks    - Install pre-commit hooks"
	@echo "  make format           - Format code with black and isort"
	@echo "  make lint             - Run flake8 linter"
	@echo "  make lint-security    - Run security checks with bandit"
	@echo "  make lint-all         - Run all linters"
	@echo "  make test             - Run pytest tests"
	@echo "  make test-cov         - Run tests with coverage report"
	@echo "  make db-init          - Initialize database and run migrations"
	@echo "  make db-migrate       - Run Alembic migrations"
	@echo "  make clean            - Clean up temporary files"

install:
	pip install -r requirements.txt

install-hooks:
	pre-commit install

format:
	black .
	isort .

lint:
	flake8 . --statistics --show-source

lint-security:
	bandit -r . -c bandit.yaml

lint-all: lint lint-security
	@echo "All linting checks passed!"

test:
	pytest

test-cov:
	pytest --cov=./ --cov-report=html --cov-report=term-missing

db-init: db-migrate

db-migrate:
	alembic upgrade head

clean:
	find . -type f -name '*.pyc' -delete
	find . -type d -name '__pycache__' -delete
	find . -type d -name '.pytest_cache' -delete
	find . -type d -name '.coverage' -delete
	find . -type d -name 'htmlcov' -delete
	find . -type d -name '.tox' -delete

check: format lint test
	@echo "All checks passed!"
