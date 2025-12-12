import secrets
import string
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str):
    """
    Hash password in bcrypt
    :param password: Plain password
    :return: Hashed password
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    """
    Verify a plain password against its hashed version
    :param plain_password: Plain password
    :param hashed_password: Hashed password
    :return: True if match, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def generate_starting_password(lenght: int = 8):
    """
    Generate a random starting password
    :param lenght: Length of the password
    :return: Randomly generated password
    """
    alphabet = string.ascii_letters + string.digits
    password = "".join(secrets.choice(alphabet) for _ in range(lenght))
    return password
