"""MEOGAP worker entrypoint."""

from worker.application.worker import main

__all__ = ['main']


if __name__ == '__main__':
    main()
