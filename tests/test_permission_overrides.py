"""Tests for explicit permission grants overriding role-based restrictions,
and for the Analyst Workload Summary "View" drill-down."""
from datetime import datetime

import pytest

from app import db
from app.models import (
    User, Role, Branch, Permission, Sample, SampleAssignment, ReviewHistory,
)
from tests.conftest import _create_user, _login


def _grant(user, *permissions):
    # Insert directly into the association table: the User.permissions setter
    # only flushes on a User row update, which a permissions-only change
    # doesn't trigger by itself.
    from app.models import user_permissions
    for p in permissions:
        db.session.execute(
            user_permissions.insert().values(user_id=user.id, permission=p)
        )
    db.session.commit()


def _make_review_data(admin, chemists):
    """Create a sample with one assignment + preliminary review per chemist."""
    sample = Sample(
        lab_number='LAB-PR-1',
        sample_name='Perm Sample',
        sample_type=Branch.PHARMACEUTICAL,
        uploaded_by=admin.id,
        date_received=datetime(2026, 1, 1),
    )
    db.session.add(sample)
    db.session.commit()
    for i, chemist in enumerate(chemists, start=1):
        assignment = SampleAssignment(
            sample_id=sample.id,
            chemist_id=chemist.id,
            test_name=f'Test-{chemist.username}',
            assigned_by=admin.id,
        )
        db.session.add(assignment)
        db.session.commit()
        db.session.add(ReviewHistory(
            sample_id=sample.id,
            assignment_id=assignment.id,
            reviewer_id=admin.id,
            review_type='preliminary',
            action='approved',
            review_number=1,
            reviewed_at=datetime(2026, 1, i),
        ))
        db.session.commit()
    return sample


# ---------------------------------------------------------------------------
# Issue 1 — explicit user permissions must override role restrictions
# ---------------------------------------------------------------------------

def test_chemist_denied_kpi_report_without_permission(client, app):
    with app.app_context():
        _create_user(role=Role.CHEMIST, username='chem')
    _login(client, 'chem')
    resp = client.get('/kpi/report', follow_redirects=True)
    assert b'Access denied' in resp.data


def test_explicit_kpi_view_permission_overrides_role(client, app):
    with app.app_context():
        user = _create_user(role=Role.CHEMIST, username='chem')
        _grant(user, Permission.KPI_VIEW)
    _login(client, 'chem')
    resp = client.get('/kpi/report')
    assert resp.status_code == 200
    resp = client.get('/reports/pharma')
    assert resp.status_code == 200


def test_explicit_manage_users_permission_overrides_role(client, app):
    with app.app_context():
        user = _create_user(role=Role.CHEMIST, username='chem')
        _grant(user, Permission.MANAGE_USERS)
    _login(client, 'chem')
    resp = client.get('/auth/users')
    assert resp.status_code == 200


def test_chemist_denied_user_list_without_permission(client, app):
    with app.app_context():
        _create_user(role=Role.CHEMIST, username='chem')
    _login(client, 'chem')
    resp = client.get('/auth/users', follow_redirects=True)
    assert b'Access denied' in resp.data


def test_explicit_assign_sample_permission_allows_edit_assignment(client, app):
    with app.app_context():
        admin = _create_user(role=Role.ADMIN, username='admin')
        chem = _create_user(role=Role.CHEMIST, username='chem')
        sample = _make_review_data(admin, [chem])
        assignment = sample.assignments.first()
        _grant(chem, Permission.ASSIGN_SAMPLE)
        assignment_id = assignment.id
    _login(client, 'chem')
    resp = client.get(f'/samples/assignment/{assignment_id}/edit')
    assert resp.status_code == 200


def test_chemist_denied_edit_assignment_without_permission(client, app):
    with app.app_context():
        admin = _create_user(role=Role.ADMIN, username='admin')
        chem = _create_user(role=Role.CHEMIST, username='chem')
        sample = _make_review_data(admin, [chem])
        assignment_id = sample.assignments.first().id
    _login(client, 'chem')
    resp = client.get(f'/samples/assignment/{assignment_id}/edit',
                      follow_redirects=True)
    assert b'Only Senior Chemists, HOD, or Admins can edit assignments.' in resp.data


# ---------------------------------------------------------------------------
# Issue 2 — Analyst Workload Summary "View" drill-down
# ---------------------------------------------------------------------------

def test_workload_view_filters_reviews_by_analyst(client, app):
    with app.app_context():
        admin = _create_user(role=Role.ADMIN, username='admin')
        chem1 = _create_user(role=Role.CHEMIST, username='chem1')
        chem2 = _create_user(role=Role.CHEMIST, username='chem2')
        _make_review_data(admin, [chem1, chem2])
        chem1_id = chem1.id
    _login(client, 'admin')
    resp = client.get(
        f'/samples/preliminary-reviews/mine?analyst_id={chem1_id}'
    )
    assert resp.status_code == 200
    assert b'Test-chem1' in resp.data
    assert b'Test-chem2' not in resp.data
    # The active drill-down is clearly indicated
    assert b'Showing reviews for' in resp.data
    # View links carry the anchor so the browser jumps to the loaded records
    assert b'#review-history' in resp.data


def test_workload_view_unknown_analyst_shows_error(client, app):
    with app.app_context():
        admin = _create_user(role=Role.ADMIN, username='admin')
        chem1 = _create_user(role=Role.CHEMIST, username='chem1')
        _make_review_data(admin, [chem1])
    _login(client, 'admin')
    resp = client.get('/samples/preliminary-reviews/mine?analyst_id=99999')
    assert resp.status_code == 200
    assert b'could not be found' in resp.data
    # Falls back to showing all reviews rather than an empty page
    assert b'Test-chem1' in resp.data


def test_workload_view_out_of_scope_analyst_shows_warning(client, app):
    with app.app_context():
        admin = _create_user(role=Role.ADMIN, username='admin')
        chem1 = _create_user(role=Role.CHEMIST, username='chem1')
        bystander = _create_user(role=Role.CHEMIST, username='nobody')
        _make_review_data(admin, [chem1])
        bystander_id = bystander.id
    _login(client, 'admin')
    resp = client.get(
        f'/samples/preliminary-reviews/mine?analyst_id={bystander_id}'
    )
    assert resp.status_code == 200
    assert b'No preliminary reviews found for' in resp.data
