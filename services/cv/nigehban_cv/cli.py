"""Command line entry point. Subcommands arrive in Phases 9-11."""

import argparse
import sys

from nigehban_cv import __version__


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="nigehban-cv", description="Nigehban Campus CV worker")
    parser.add_argument("--version", action="version", version=f"nigehban-cv {__version__}")
    return parser


def main(argv: list[str] | None = None) -> int:
    build_parser().parse_args(argv)
    return 0


if __name__ == "__main__":
    sys.exit(main())
