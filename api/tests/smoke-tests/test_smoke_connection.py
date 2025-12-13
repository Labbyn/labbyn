import pytest
import subprocess


@pytest.mark.smoke
def test_redis_connection():
    """Test connection to redis service"""
    cmd = "redis-cli -h redis -p 6379 ping"
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, check=True
        )
    except subprocess.CalledProcessError as e:
        print(f"Command failed with return code: {e.returncode}. Error:{e.stderr}")
    assert "PONG" in result.stdout
