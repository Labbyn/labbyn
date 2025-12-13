from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

@router.post("/deploy/node_exporter")
async def deploy_node_exporter():
    """
    Trigger Ansible playbook to deploy Node Exporter
    """
