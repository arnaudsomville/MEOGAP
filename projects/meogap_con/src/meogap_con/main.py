"""MEOGAP control and orchestration entrypoint."""

from meogap_con.application.app import APPLICATION


def main() -> None:
    """Run the con application."""
    APPLICATION.run()


if __name__ == '__main__':
    main()
