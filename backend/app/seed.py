"""Initialize an empty database. Election content is managed through the admin API."""
from .create_db import create_all

if __name__ == "__main__":
    create_all()
