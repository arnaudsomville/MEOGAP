"""MEOGAP scientific processing entrypoint."""

from meogap_sci.application.app import APPLICATION


def main() -> None:
    """Run the sci application."""
    APPLICATION.run()


if __name__ == '__main__':
    main()
