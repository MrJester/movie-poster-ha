#!/usr/bin/env python3
"""Build a reviewable built-in candidate from an exported presentation."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from custom_components.movie_poster.presentation_promotion import (
    build_promotion_bundle,
)


def main() -> None:
    """Validate the source package and write its deterministic candidate bundle."""
    parser = argparse.ArgumentParser()
    parser.add_argument("package", type=Path)
    parser.add_argument("candidate_id")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    destination = args.output or Path(f"{args.candidate_id}.builtin-candidate.zip")
    destination.write_bytes(
        build_promotion_bundle(args.package.read_bytes(), args.candidate_id)
    )
    sys.stdout.write(f"{destination}\n")


if __name__ == "__main__":
    main()
