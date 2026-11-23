"""MEOGAP scientific processing entrypoint."""

from scientific_processing.application.app import APPLICATION


def main() -> None:
    """Run the sci application."""
    APPLICATION.run()


if __name__ == '__main__':
    main()
