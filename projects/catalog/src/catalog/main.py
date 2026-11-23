"""MEOGAP data and asset catalogue entrypoint."""

from catalog.application.app import APPLICATION


def main() -> None:
    """Run the cat application."""
    APPLICATION.run()


if __name__ == '__main__':
    main()
