"""MEOGAP public gateway entrypoint."""

from meogap_gat.application.app import APPLICATION


def main() -> None:
    """Run the gat application."""
    APPLICATION.run()


if __name__ == '__main__':
    main()
