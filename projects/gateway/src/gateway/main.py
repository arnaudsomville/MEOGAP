"""MEOGAP public gateway entrypoint."""

from gateway.application.app import APPLICATION


def main() -> None:
    """Run the gat application."""
    APPLICATION.run()


if __name__ == '__main__':
    main()
