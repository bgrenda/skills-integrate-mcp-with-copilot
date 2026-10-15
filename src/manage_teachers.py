"""Manage local teacher accounts used by the activities API."""

import argparse
import getpass
import hashlib
import json
import os
import secrets
from pathlib import Path


TEACHERS_FILE = Path(os.environ.get("TEACHERS_FILE", Path(__file__).with_name("teachers.json")))
ITERATIONS = 310_000


def add_teacher(email: str, name: str) -> None:
    normalized_email = email.strip().casefold()
    if not normalized_email or "@" not in normalized_email:
        raise ValueError("Enter a valid teacher email address.")
    if not name.strip():
        raise ValueError("Enter the teacher's name.")

    password = getpass.getpass("Teacher password: ")
    confirmation = getpass.getpass("Confirm password: ")
    if len(password) < 12:
        raise ValueError("Use a password with at least 12 characters.")
    if password != confirmation:
        raise ValueError("Passwords do not match.")

    if TEACHERS_FILE.exists():
        with TEACHERS_FILE.open(encoding="utf-8") as teachers_file:
            data = json.load(teachers_file)
    else:
        data = {"teachers": []}

    teachers = data.setdefault("teachers", [])
    if any(entry.get("email", "").casefold() == normalized_email for entry in teachers):
        raise ValueError("A teacher with that email already exists.")

    salt = secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, ITERATIONS
    ).hex()
    teachers.append(
        {
            "email": normalized_email,
            "name": name.strip(),
            "salt": salt.hex(),
            "password_hash": password_hash,
        }
    )

    with TEACHERS_FILE.open("w", encoding="utf-8") as teachers_file:
        json.dump(data, teachers_file, indent=2)
        teachers_file.write("\n")
    if os.name == "posix":
        TEACHERS_FILE.chmod(0o600)
    print(f"Added teacher account for {normalized_email}.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    add_parser = subparsers.add_parser("add", help="Add a teacher account")
    add_parser.add_argument("email")
    add_parser.add_argument("name")
    args = parser.parse_args()

    if args.command == "add":
        add_teacher(args.email, args.name)


if __name__ == "__main__":
    main()