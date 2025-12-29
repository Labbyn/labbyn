import secrets
import string
from fastapi_users.password import PasswordHelper

password_helper = PasswordHelper()

def hash_password(password: str):
    """
    Hash password in bcrypt
    :param password: Plain password
    :return: Hashed password
    """
    return password_helper.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    """
    Verify a plain password against its hashed version
    :param plain_password: Plain password
    :param hashed_password: Hashed password
    :return: True if match, False otherwise
    """
    status, _ = password_helper.verify_and_update(plain_password, hashed_password)
    return status

def generate_starting_password(lenght: int = 8):
    """
    Generate a random starting password
    :param lenght: Length of the password
    :return: Randomly generated password
    """
    alphabet = string.ascii_letters + string.digits
    password = "".join(secrets.choice(alphabet) for _ in range(lenght))
    return password
