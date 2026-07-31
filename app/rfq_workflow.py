"""RFQ (Request For Quotation) Workflow Management.

This module contains business logic for managing the two-step approval workflow:
1. Specification Review - verify quotation compliance with specs
2. Branch Head Approval - final authorization before supplier selection

All state transitions are logged in RFQApprovalHistory for audit trail.
"""

from datetime import datetime
from flask import current_app

from app import db
from app.models import (
    RFQ, Quotation, RFQApprovalHistory, AuditLog,
    RFQStatus, QuotationStatus, ApprovalAction, jamaica_now
)
from app.notifications import (
    notify_rfq_quotes_uploaded,
    notify_rfq_spec_review_completed,
    notify_rfq_approved,
    notify_rfq_rejected,
    notify_rfq_returned_for_clarification,
    notify_quotation_returned_for_clarification,
)


# ---------------------------------------------------------------------------
# Quotation Specification Review Workflow
# ---------------------------------------------------------------------------

def approve_quotation_specification_review(quotation, approver, comments=None):
    """Approve a quotation at the specification review stage.
    
    This indicates that the quotation meets the specified requirements.
    The quotation then moves to the Branch Head approval stage.
    
    Args:
        quotation: Quotation object to approve
        approver: User object (specification reviewer) performing approval
        comments: Optional approval comments
        
    Returns:
        RFQApprovalHistory record created
    """
    previous_status = quotation.specification_review_status
    quotation.specification_review_status = QuotationStatus.SPEC_REVIEW_APPROVED
    quotation.updated_at = jamaica_now()
    
    # Record approval in history
    history = RFQApprovalHistory(
        quotation_id=quotation.id,
        rfq_id=quotation.rfq_id,
        approval_stage='specification_review',
        action=ApprovalAction.APPROVED,
        approver_id=approver.id,
        approved_at=jamaica_now(),
        comments=comments,
        previous_stage='pending',
        new_stage='specification_review_approved',
    )
    
    # Audit log
    AuditLog.add_entry(
        action='QUOTATION_SPEC_REVIEW_APPROVED',
        entity_type='Quotation',
        entity_id=quotation.id,
        entity_label=f'Quotation #{quotation.id} for RFQ {quotation.rfq.rfq_number}',
        performed_by=approver.id,
        human_description=(
            f'{approver.full_name} approved quotation from {quotation.supplier_name} '
            f'at specification review stage for RFQ {quotation.rfq.rfq_number}'
        ),
        new_stage='specification_review_approved',
        previous_stage=previous_status.value if previous_status else 'pending',
        comments=comments,
    )
    
    db.session.add(history)
    db.session.commit()
    
    current_app.logger.info(
        f'Quotation #{quotation.id} approved at specification review by {approver.username}'
    )
    
    # Check if all quotations are now spec-review approved → notify branch head
    _check_and_route_to_branch_approval(quotation.rfq)
    
    return history


def reject_quotation_specification_review(quotation, approver, comments=None):
    """Reject a quotation at the specification review stage.
    
    This indicates the quotation does not comply with specifications.
    The quotation is marked as rejected and supplier is notified.
    
    Args:
        quotation: Quotation object to reject
        approver: User object (specification reviewer) performing rejection
        comments: Optional rejection comments
        
    Returns:
        RFQApprovalHistory record created
    """
    previous_status = quotation.specification_review_status
    quotation.specification_review_status = QuotationStatus.SPEC_REVIEW_REJECTED
    quotation.overall_status = 'rejected'
    quotation.updated_at = jamaica_now()
    
    # Record rejection in history
    history = RFQApprovalHistory(
        quotation_id=quotation.id,
        rfq_id=quotation.rfq_id,
        approval_stage='specification_review',
        action=ApprovalAction.REJECTED,
        approver_id=approver.id,
        approved_at=jamaica_now(),
        comments=comments,
        previous_stage='pending',
        new_stage='specification_review_rejected',
    )
    
    # Audit log
    AuditLog.add_entry(
        action='QUOTATION_SPEC_REVIEW_REJECTED',
        entity_type='Quotation',
        entity_id=quotation.id,
        entity_label=f'Quotation #{quotation.id} for RFQ {quotation.rfq.rfq_number}',
        performed_by=approver.id,
        human_description=(
            f'{approver.full_name} rejected quotation from {quotation.supplier_name} '
            f'at specification review stage for RFQ {quotation.rfq.rfq_number}'
        ),
        new_stage='specification_review_rejected',
        previous_stage=previous_status.value if previous_status else 'pending',
        comments=comments,
    )
    
    db.session.add(history)
    db.session.commit()
    
    current_app.logger.info(
        f'Quotation #{quotation.id} rejected at specification review by {approver.username}'
    )
    
    return history


def return_quotation_specification_review(quotation, approver, comments=None):
    """Return a quotation at specification review for clarification.
    
    Indicates that the quotation needs additional information or corrections
    before it can be approved or rejected.
    
    Args:
        quotation: Quotation object to return
        approver: User object (specification reviewer) performing return
        comments: Optional clarification comments
        
    Returns:
        RFQApprovalHistory record created
    """
    previous_status = quotation.specification_review_status
    quotation.specification_review_status = QuotationStatus.PENDING
    quotation.updated_at = jamaica_now()
    
    # Record return in history
    history = RFQApprovalHistory(
        quotation_id=quotation.id,
        rfq_id=quotation.rfq_id,
        approval_stage='specification_review',
        action=ApprovalAction.RETURNED,
        approver_id=approver.id,
        approved_at=jamaica_now(),
        comments=comments,
        previous_stage='pending',
        new_stage='returned_for_clarification',
    )
    
    # Audit log
    AuditLog.add_entry(
        action='QUOTATION_SPEC_REVIEW_RETURNED',
        entity_type='Quotation',
        entity_id=quotation.id,
        entity_label=f'Quotation #{quotation.id} for RFQ {quotation.rfq.rfq_number}',
        performed_by=approver.id,
        human_description=(
            f'{approver.full_name} returned quotation from {quotation.supplier_name} '
            f'for clarification at specification review stage for RFQ {quotation.rfq.rfq_number}'
        ),
        new_stage='returned_for_clarification',
        previous_stage=previous_status.value if previous_status else 'pending',
        comments=comments,
    )
    
    db.session.add(history)
    db.session.commit()
    
    # Notify supplier of return
    notify_quotation_returned_for_clarification(
        quotation, 'Specification Review', comments
    )
    
    current_app.logger.info(
        f'Quotation #{quotation.id} returned at specification review by {approver.username}'
    )
    
    return history


# ---------------------------------------------------------------------------
# Branch Head Approval Workflow
# ---------------------------------------------------------------------------

def approve_rfq_branch_approval(rfq, branch_head, comments=None):
    """Approve the entire RFQ at the branch head approval stage.
    
    This is the final approval. After this, the RFQ can proceed to
    supplier selection and award.
    
    Args:
        rfq: RFQ object to approve
        branch_head: User object (branch head) performing approval
        comments: Optional approval comments
        
    Returns:
        RFQApprovalHistory record created
    """
    previous_status = rfq.status
    rfq.status = RFQStatus.APPROVED
    rfq.updated_at = jamaica_now()
    
    # Record approval in history
    history = RFQApprovalHistory(
        rfq_id=rfq.id,
        approval_stage='branch_approval',
        action=ApprovalAction.APPROVED,
        approver_id=branch_head.id,
        approved_at=jamaica_now(),
        comments=comments,
        previous_stage='awaiting_branch_approval',
        new_stage='approved',
    )
    
    # Audit log
    AuditLog.add_entry(
        action='RFQ_BRANCH_APPROVED',
        entity_type='RFQ',
        entity_id=rfq.id,
        entity_label=rfq.rfq_number,
        performed_by=branch_head.id,
        human_description=(
            f'{branch_head.full_name} approved RFQ {rfq.rfq_number} '
            f'"{rfq.title}" for supplier selection and award'
        ),
        new_stage='approved',
        previous_stage=previous_status.value,
        comments=comments,
    )
    
    db.session.add(history)
    db.session.commit()
    
    # Notify requestor of final approval
    notify_rfq_approved(rfq)
    
    current_app.logger.info(
        f'RFQ #{rfq.id} approved at branch head stage by {branch_head.username}'
    )
    
    return history


def reject_rfq_branch_approval(rfq, branch_head, comments=None):
    """Reject the entire RFQ at the branch head approval stage.
    
    This is a final rejection. The RFQ cannot proceed to supplier selection.
    
    Args:
        rfq: RFQ object to reject
        branch_head: User object (branch head) performing rejection
        comments: Optional rejection comments
        
    Returns:
        RFQApprovalHistory record created
    """
    previous_status = rfq.status
    rfq.status = RFQStatus.REJECTED
    rfq.updated_at = jamaica_now()
    
    # Record rejection in history
    history = RFQApprovalHistory(
        rfq_id=rfq.id,
        approval_stage='branch_approval',
        action=ApprovalAction.REJECTED,
        approver_id=branch_head.id,
        approved_at=jamaica_now(),
        comments=comments,
        previous_stage='awaiting_branch_approval',
        new_stage='rejected',
    )
    
    # Audit log
    AuditLog.add_entry(
        action='RFQ_BRANCH_REJECTED',
        entity_type='RFQ',
        entity_id=rfq.id,
        entity_label=rfq.rfq_number,
        performed_by=branch_head.id,
        human_description=(
            f'{branch_head.full_name} rejected RFQ {rfq.rfq_number} '
            f'"{rfq.title}" at branch head approval stage'
        ),
        new_stage='rejected',
        previous_stage=previous_status.value,
        comments=comments,
    )
    
    db.session.add(history)
    db.session.commit()
    
    # Notify requestor of rejection
    notify_rfq_rejected(rfq, 'Branch Head Approval', comments)
    
    current_app.logger.info(
        f'RFQ #{rfq.id} rejected at branch head stage by {branch_head.username}'
    )
    
    return history


def return_rfq_branch_approval(rfq, branch_head, comments=None):
    """Return the entire RFQ at branch head approval for clarification.
    
    Indicates that the RFQ/quotations need additional information or corrections
    before final approval can be given.
    
    Args:
        rfq: RFQ object to return
        branch_head: User object (branch head) performing return
        comments: Optional clarification comments
        
    Returns:
        RFQApprovalHistory record created
    """
    previous_status = rfq.status
    rfq.status = RFQStatus.AWAITING_SPEC_REVIEW  # Back to spec review
    rfq.updated_at = jamaica_now()
    
    # Record return in history
    history = RFQApprovalHistory(
        rfq_id=rfq.id,
        approval_stage='branch_approval',
        action=ApprovalAction.RETURNED,
        approver_id=branch_head.id,
        approved_at=jamaica_now(),
        comments=comments,
        previous_stage='awaiting_branch_approval',
        new_stage='returned_for_clarification',
    )
    
    # Audit log
    AuditLog.add_entry(
        action='RFQ_BRANCH_RETURNED',
        entity_type='RFQ',
        entity_id=rfq.id,
        entity_label=rfq.rfq_number,
        performed_by=branch_head.id,
        human_description=(
            f'{branch_head.full_name} returned RFQ {rfq.rfq_number} '
            f'for clarification from branch head approval stage'
        ),
        new_stage='returned_for_clarification',
        previous_stage=previous_status.value,
        comments=comments,
    )
    
    db.session.add(history)
    db.session.commit()
    
    # Notify requestor of return for clarification
    notify_rfq_returned_for_clarification(rfq, 'Branch Head Approval', comments)
    
    current_app.logger.info(
        f'RFQ #{rfq.id} returned at branch head stage by {branch_head.username}'
    )
    
    return history


# ---------------------------------------------------------------------------
# Workflow Routing & State Transitions
# ---------------------------------------------------------------------------

def route_rfq_to_specification_review(rfq):
    """Route RFQ to specification reviewer when quotations are uploaded.
    
    Changes RFQ status from AWAITING_QUOTES to AWAITING_SPEC_REVIEW
    and sends notification to designated reviewer.
    
    Args:
        rfq: RFQ object to route
    """
    if rfq.status == RFQStatus.AWAITING_QUOTES:
        rfq.status = RFQStatus.AWAITING_SPEC_REVIEW
        rfq.updated_at = jamaica_now()
        
        # Log status change
        AuditLog.add_entry(
            action='RFQ_ROUTED_TO_SPEC_REVIEW',
            entity_type='RFQ',
            entity_id=rfq.id,
            entity_label=rfq.rfq_number,
            performed_by=1,  # System action
            human_description=f'RFQ {rfq.rfq_number} routed to specification reviewer',
            previous_stage='awaiting_quotes',
            new_stage='awaiting_spec_review',
        )
        
        db.session.commit()
        
        # Notify specification reviewer
        quotation_count = rfq.quotations.count()
        notify_rfq_quotes_uploaded(rfq, quotation_count)


def _check_and_route_to_branch_approval(rfq):
    """Check if all quotations are spec-review approved, then route to branch head.
    
    This is called after each quotation approval at spec review stage.
    If all non-rejected quotations are approved, the RFQ is routed
    to the branch head for final approval.
    
    Args:
        rfq: RFQ object to check
    """
    # Count quotations by status
    total = rfq.quotations.count()
    approved_count = rfq.quotations.filter_by(
        specification_review_status=QuotationStatus.SPEC_REVIEW_APPROVED
    ).count()
    rejected_count = rfq.quotations.filter_by(
        specification_review_status=QuotationStatus.SPEC_REVIEW_REJECTED
    ).count()
    
    # If we have at least one approved and all others are either approved or rejected
    if approved_count > 0 and (approved_count + rejected_count == total):
        rfq.status = RFQStatus.AWAITING_BRANCH_APPROVAL
        rfq.updated_at = jamaica_now()
        
        # Log status change
        AuditLog.add_entry(
            action='RFQ_ROUTED_TO_BRANCH_APPROVAL',
            entity_type='RFQ',
            entity_id=rfq.id,
            entity_label=rfq.rfq_number,
            performed_by=1,  # System action
            human_description=(
                f'RFQ {rfq.rfq_number} routed to branch head after spec review: '
                f'{approved_count} approved, {rejected_count} rejected'
            ),
            previous_stage='awaiting_spec_review',
            new_stage='awaiting_branch_approval',
        )
        
        db.session.commit()
        
        # Notify branch head
        notify_rfq_spec_review_completed(rfq, 'approved', approved_count)


def mark_quotations_received(rfq):
    """Mark quotations as received and route RFQ to specification review.
    
    Called when the first quotation is uploaded for an RFQ.
    
    Args:
        rfq: RFQ object with new quotation
    """
    if rfq.status == RFQStatus.DRAFT:
        rfq.status = RFQStatus.AWAITING_QUOTES
        rfq.updated_at = jamaica_now()
        db.session.commit()
    
    route_rfq_to_specification_review(rfq)
