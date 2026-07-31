"""RFQ (Request For Quotation) Routes - Procurement Workflow Management.

This module handles all RFQ-related endpoints for creating RFQs, uploading quotations,
and managing the two-step approval workflow.
"""

import os
from datetime import datetime
from flask import render_template, redirect, url_for, flash, request, abort, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename

from app import db
from app.rfq import rfq_bp
from app.models import (
    RFQ, Quotation, RFQApprovalHistory, AuditLog, User, Role, Permission,
    RFQStatus, QuotationStatus, ApprovalAction, jamaica_now
)
from app.forms import (
    CreateRFQForm, UploadQuotationForm, SpecificationReviewForm, BranchHeadApprovalForm
)
from app.rfq_workflow import (
    approve_quotation_specification_review,
    reject_quotation_specification_review,
    return_quotation_specification_review,
    approve_rfq_branch_approval,
    reject_rfq_branch_approval,
    return_rfq_branch_approval,
    mark_quotations_received,
)


# ============================================================================
# RFQ Management Routes
# ============================================================================

@rfq_bp.route('/', methods=['GET'])
@login_required
def list_rfqs():
    """List all RFQs with status filtering.
    
    Users can filter by:
    - Status (draft, awaiting quotes, awaiting spec review, awaiting branch approval, approved, rejected)
    - Branch
    - Role (show only RFQs relevant to user's role)
    """
    # Determine which RFQs to show based on user's role
    if current_user.has_role(Role.ADMIN):
        # Admin sees all RFQs
        query = RFQ.query
    elif current_user.has_permission(Permission.RFQ_SPECIFICATION_REVIEW):
        # Spec reviewer sees RFQs assigned to them + RFQs they created
        query = RFQ.query.filter(
            db.or_(
                RFQ.specification_reviewer_id == current_user.id,
                RFQ.created_by == current_user.id
            )
        )
    elif current_user.has_permission(Permission.RFQ_BRANCH_APPROVAL):
        # Branch head sees RFQs assigned to them + RFQs they created
        query = RFQ.query.filter(
            db.or_(
                RFQ.branch_head_approval_by_id == current_user.id,
                RFQ.created_by == current_user.id
            )
        )
    elif current_user.has_permission(Permission.RFQ_CREATE):
        # Requestor sees only their own RFQs
        query = RFQ.query.filter_by(created_by=current_user.id)
    else:
        # No RFQ permissions - empty list
        query = RFQ.query.filter_by(id=-1)  # Returns empty list
    
    # Apply filters
    status_filter = request.args.get('status', '')
    if status_filter:
        try:
            status = RFQStatus[status_filter.upper()]
            query = query.filter_by(status=status)
        except KeyError:
            pass  # Invalid status filter, ignore
    
    branch_filter = request.args.get('branch', '')
    if branch_filter:
        from app.models import Branch
        try:
            branch = Branch[branch_filter.upper()]
            query = query.filter_by(branch=branch)
        except KeyError:
            pass  # Invalid branch filter, ignore
    
    # Sort by created_at descending
    rfqs = query.order_by(RFQ.created_at.desc()).all()
    
    return render_template(
        'rfq/list.html',
        rfqs=rfqs,
        RFQStatus=RFQStatus,
        status_filter=status_filter,
        branch_filter=branch_filter,
    )


@rfq_bp.route('/create', methods=['GET', 'POST'])
@login_required
def create_rfq():
    """Create a new RFQ.
    
    Only users with RFQ_CREATE permission or Admin can create RFQs.
    """
    if not (current_user.has_permission(Permission.RFQ_CREATE) or current_user.has_role(Role.ADMIN)):
        flash('You do not have permission to create RFQs.', 'danger')
        abort(403)
    
    form = CreateRFQForm()
    
    # Populate reviewer and branch head dropdowns
    form.specification_reviewer.choices = [
        (u.id, u.full_name) for u in User.query.filter_by(is_active_user=True).all()
    ]
    form.branch_head_approver.choices = [
        (u.id, u.full_name) for u in User.query.filter_by(is_active_user=True).all()
    ]
    
    if form.validate_on_submit():
        # Generate RFQ number (format: RFQ-YYYYMMDD-XXXX)
        from datetime import date
        today = date.today()
        date_part = today.strftime('%Y%m%d')
        last_rfq = RFQ.query.filter(
            RFQ.rfq_number.like(f'RFQ-{date_part}-%')
        ).order_by(RFQ.rfq_number.desc()).first()
        
        if last_rfq:
            # Extract counter and increment
            counter = int(last_rfq.rfq_number.split('-')[-1]) + 1
        else:
            counter = 1
        
        rfq_number = f'RFQ-{date_part}-{counter:04d}'
        
        # Create RFQ
        rfq = RFQ(
            rfq_number=rfq_number,
            title=form.title.data,
            description=form.description.data,
            branch=form.branch.data,
            created_by=current_user.id,
            specification_reviewer_id=form.specification_reviewer.data,
            branch_head_approval_by_id=form.branch_head_approver.data,
            status=RFQStatus.DRAFT,
        )
        
        # Audit log
        AuditLog.add_entry(
            action='RFQ_CREATED',
            entity_type='RFQ',
            entity_id=None,  # Will be set after flush
            performed_by=current_user.id,
            human_description=f'{current_user.full_name} created RFQ "{rfq.title}"',
            new_stage='draft',
        )
        
        db.session.add(rfq)
        db.session.flush()  # Get RFQ ID
        
        # Update audit log with RFQ ID and label
        audit = db.session.query(AuditLog).filter_by(
            action='RFQ_CREATED',
            performed_by=current_user.id,
        ).order_by(AuditLog.performed_at.desc()).first()
        
        if audit:
            audit.entity_id = rfq.id
            audit.entity_label = rfq.rfq_number
        
        db.session.commit()
        
        flash(f'RFQ {rfq.rfq_number} created successfully.', 'success')
        return redirect(url_for('rfq.view_rfq_detail', rfq_id=rfq.id))
    
    return render_template('rfq/create.html', form=form)


@rfq_bp.route('/<int:rfq_id>', methods=['GET'])
@login_required
def view_rfq_detail(rfq_id):
    """View RFQ details with all quotations and approval history.
    
    Shows:
    - RFQ information and status
    - All quotations with their approval status
    - Approval history (audit trail)
    - Action buttons based on user role and RFQ status
    """
    rfq = RFQ.query.get_or_404(rfq_id)
    
    # Check access - user can view if:
    # - Admin
    # - RFQ creator
    # - Specification reviewer
    # - Branch head approver
    can_view = (
        current_user.has_role(Role.ADMIN)
        or rfq.created_by == current_user.id
        or rfq.specification_reviewer_id == current_user.id
        or rfq.branch_head_approval_by_id == current_user.id
    )
    
    if not can_view:
        flash('You do not have permission to view this RFQ.', 'danger')
        abort(403)
    
    # Determine actions available to current user
    can_upload_quotation = (
        current_user.has_role(Role.ADMIN)
        or rfq.created_by == current_user.id
    )
    
    can_do_spec_review = (
        rfq.specification_reviewer_id == current_user.id
        and rfq.status == RFQStatus.AWAITING_SPEC_REVIEW
    )
    
    can_do_branch_approval = (
        rfq.branch_head_approval_by_id == current_user.id
        and rfq.status == RFQStatus.AWAITING_BRANCH_APPROVAL
    )
    
    # Get quotations and approval history
    quotations = rfq.quotations.order_by(Quotation.uploaded_at.desc()).all()
    approval_history = rfq.approval_history.all()
    
    return render_template(
        'rfq/detail.html',
        rfq=rfq,
        quotations=quotations,
        approval_history=approval_history,
        RFQStatus=RFQStatus,
        QuotationStatus=QuotationStatus,
        ApprovalAction=ApprovalAction,
        can_upload_quotation=can_upload_quotation,
        can_do_spec_review=can_do_spec_review,
        can_do_branch_approval=can_do_branch_approval,
    )


# ============================================================================
# Quotation Management Routes
# ============================================================================

@rfq_bp.route('/<int:rfq_id>/upload-quotation', methods=['GET', 'POST'])
@login_required
def upload_quotation(rfq_id):
    """Upload a quotation for an RFQ.
    
    Quotations can only be uploaded to RFQs in DRAFT or AWAITING_QUOTES status.
    After upload, the RFQ is automatically routed to the specification reviewer.
    """
    rfq = RFQ.query.get_or_404(rfq_id)
    
    # Check permission
    if not (current_user.has_role(Role.ADMIN) or rfq.created_by == current_user.id):
        flash('You do not have permission to upload quotations for this RFQ.', 'danger')
        abort(403)
    
    # Check RFQ status
    if rfq.status not in (RFQStatus.DRAFT, RFQStatus.AWAITING_QUOTES):
        flash(
            f'Cannot upload quotations to RFQ in {rfq.status.value} status.',
            'danger'
        )
        abort(403)
    
    form = UploadQuotationForm()
    
    if form.validate_on_submit():
        # Save uploaded file
        file = form.quotation_file.data
        filename = secure_filename(file.filename)
        
        # Create upload directory if needed
        upload_folder = current_app.config.get('UPLOAD_FOLDER', '/tmp/uploads')
        os.makedirs(upload_folder, exist_ok=True)
        
        # Store with timestamp to avoid conflicts
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        filepath = os.path.join(upload_folder, timestamp + filename)
        file.save(filepath)
        
        # Create quotation record
        quotation = Quotation(
            rfq_id=rfq.id,
            supplier_name=form.supplier_name.data,
            supplier_contact=form.supplier_contact.data,
            supplier_email=form.supplier_email.data,
            file_path=filepath,
            file_original_name=filename,
            uploaded_by=current_user.id,
        )
        
        # Audit log
        AuditLog.add_entry(
            action='QUOTATION_UPLOADED',
            entity_type='Quotation',
            entity_id=None,  # Will set after flush
            performed_by=current_user.id,
            human_description=(
                f'{current_user.full_name} uploaded quotation from {form.supplier_name.data} '
                f'for RFQ {rfq.rfq_number}'
            ),
            new_stage='pending_spec_review',
        )
        
        db.session.add(quotation)
        db.session.flush()
        
        # Update audit log with quotation ID
        audit = db.session.query(AuditLog).filter_by(
            action='QUOTATION_UPLOADED',
            performed_by=current_user.id,
        ).order_by(AuditLog.performed_at.desc()).first()
        
        if audit:
            audit.entity_id = quotation.id
            audit.entity_label = f'Quotation #{quotation.id} for RFQ {rfq.rfq_number}'
        
        # Mark quotations as received and route to spec reviewer
        mark_quotations_received(rfq)
        
        db.session.commit()
        
        flash(f'Quotation from {form.supplier_name.data} uploaded successfully.', 'success')
        return redirect(url_for('rfq.view_rfq_detail', rfq_id=rfq.id))
    
    return render_template(
        'rfq/upload_quotation.html',
        rfq=rfq,
        form=form,
    )


# ============================================================================
# Specification Review Routes
# ============================================================================

@rfq_bp.route('/quotation/<int:quotation_id>/spec-review', methods=['GET', 'POST'])
@login_required
def quotation_spec_review(quotation_id):
    """Specification review for a quotation.
    
    The designated specification reviewer approves, rejects, or returns
    the quotation for clarification.
    """
    quotation = Quotation.query.get_or_404(quotation_id)
    rfq = quotation.rfq
    
    # Check permission - must be designated specification reviewer
    if rfq.specification_reviewer_id != current_user.id and not current_user.has_role(Role.ADMIN):
        flash('You do not have permission to review this quotation.', 'danger')
        abort(403)
    
    # Check RFQ status - must be awaiting spec review
    if rfq.status != RFQStatus.AWAITING_SPEC_REVIEW:
        flash(
            f'Cannot review quotations for RFQ in {rfq.status.value} status.',
            'danger'
        )
        abort(403)
    
    form = SpecificationReviewForm()
    
    if form.validate_on_submit():
        action = form.action.data
        comments = form.comments.data
        
        if action == 'approved':
            approve_quotation_specification_review(quotation, current_user, comments)
            flash('Quotation approved at specification review stage.', 'success')
        
        elif action == 'rejected':
            reject_quotation_specification_review(quotation, current_user, comments)
            flash('Quotation rejected at specification review stage.', 'warning')
        
        elif action == 'returned':
            return_quotation_specification_review(quotation, current_user, comments)
            flash('Quotation returned for clarification.', 'info')
        
        return redirect(url_for('rfq.view_rfq_detail', rfq_id=rfq.id))
    
    return render_template(
        'rfq/specification_review.html',
        quotation=quotation,
        rfq=rfq,
        form=form,
    )


# ============================================================================
# Branch Head Approval Routes
# ============================================================================

@rfq_bp.route('/<int:rfq_id>/branch-approval', methods=['GET', 'POST'])
@login_required
def rfq_branch_approval(rfq_id):
    """Branch head approval for an RFQ.
    
    The designated branch head approves, rejects, or returns the RFQ
    for clarification before proceeding to supplier selection.
    """
    rfq = RFQ.query.get_or_404(rfq_id)
    
    # Check permission - must be designated branch head
    if rfq.branch_head_approval_by_id != current_user.id and not current_user.has_role(Role.ADMIN):
        flash('You do not have permission to approve this RFQ.', 'danger')
        abort(403)
    
    # Check RFQ status - must be awaiting branch approval
    if rfq.status != RFQStatus.AWAITING_BRANCH_APPROVAL:
        flash(
            f'Cannot approve RFQ in {rfq.status.value} status.',
            'danger'
        )
        abort(403)
    
    form = BranchHeadApprovalForm()
    
    if form.validate_on_submit():
        action = form.action.data
        comments = form.comments.data
        
        if action == 'approved':
            approve_rfq_branch_approval(rfq, current_user, comments)
            flash('RFQ approved at branch head stage. Ready for supplier selection.', 'success')
        
        elif action == 'rejected':
            reject_rfq_branch_approval(rfq, current_user, comments)
            flash('RFQ rejected at branch head stage.', 'warning')
        
        elif action == 'returned':
            return_rfq_branch_approval(rfq, current_user, comments)
            flash('RFQ returned to specification review stage for clarification.', 'info')
        
        return redirect(url_for('rfq.view_rfq_detail', rfq_id=rfq.id))
    
    # Get approved quotations for display
    approved_quotations = rfq.quotations.filter_by(
        specification_review_status=QuotationStatus.SPEC_REVIEW_APPROVED
    ).all()
    
    return render_template(
        'rfq/branch_approval.html',
        rfq=rfq,
        approved_quotations=approved_quotations,
        form=form,
    )


# ============================================================================
# Audit Trail Route
# ============================================================================

@rfq_bp.route('/<int:rfq_id>/audit-trail', methods=['GET'])
@login_required
def view_audit_trail(rfq_id):
    """View the complete audit trail for an RFQ.
    
    Shows all approval actions, rejections, returns, and state transitions
    with timestamps and approver details.
    """
    rfq = RFQ.query.get_or_404(rfq_id)
    
    # Check access - same as view_rfq_detail
    can_view = (
        current_user.has_role(Role.ADMIN)
        or rfq.created_by == current_user.id
        or rfq.specification_reviewer_id == current_user.id
        or rfq.branch_head_approval_by_id == current_user.id
    )
    
    if not can_view:
        flash('You do not have permission to view this RFQ.', 'danger')
        abort(403)
    
    # Get all approval history
    approval_history = rfq.approval_history.order_by(
        RFQApprovalHistory.approved_at.desc()
    ).all()
    
    # Get all quotation approval history
    quotation_history = RFQApprovalHistory.query.filter(
        RFQApprovalHistory.rfq_id == rfq.id
    ).order_by(RFQApprovalHistory.approved_at.desc()).all()
    
    return render_template(
        'rfq/audit_trail.html',
        rfq=rfq,
        approval_history=approval_history,
        ApprovalAction=ApprovalAction,
    )
