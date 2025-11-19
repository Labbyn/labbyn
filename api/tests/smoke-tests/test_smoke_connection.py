import pytest
import subprocess


@pytest.mark.smoke
def test_get_prometheus_instances():
    cmd = "redis-cli ping"
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Command failed with return code: {e.returncode}. Error:{e.stderr}")
    assert "PONG" in result.stdout
