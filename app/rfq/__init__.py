"""RFQ (Request For Quotation) Blueprint - Procurement Workflow Management."""

from flask import Blueprint

rfq_bp = Blueprint('rfq', __name__, url_prefix='/rfq')

from app.rfq import routes  # noqa: F401, E402
