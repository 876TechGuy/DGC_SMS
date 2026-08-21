"""Tests for the Assignment Dashboard JSON API (live-data endpoints)."""
from datetime import date, timedelta

from app import db
from app.models import Role, Branch, Sample, SampleAssignment, AssignmentStatus
from tests.conftest import _create_user, _login


def _make_sample_and_assignment(officer_id, chemist_id, lab_number='FOOD-001',
                                 expected_completion=None, status=AssignmentStatus.ASSIGNED):
    sample = Sample(
        lab_number=lab_number, sample_name='Test Sample',
        sample_type=Branch.FOOD_MILK, date_received=date.today(),
        uploaded_by=officer_id,
    )
    db.session.add(sample)
    db.session.flush()
    assignment = SampleAssignment(
        sample_id=sample.id, chemist_id=chemist_id, assigned_by=officer_id,
        test_name='Fat Content', expected_completion=expected_completion,
        status=status,
    )
    db.session.add(assignment)
    db.session.commit()
    return sample, assignment


def test_assignment_dashboard_page_smoke(app, client):
    with app.app_context():
        _create_user(role=Role.OFFICER, username='officer', must_change_password=False)
    _login(client, username='officer')
    resp = client.get('/assignments')
    assert resp.status_code == 200
    assert b'Assignment Dashboard' in resp.data


def test_api_records_supervisor_sees_all(app, client):
    with app.app_context():
        officer = _create_user(role=Role.OFFICER, username='officer', must_change_password=False)
        chemist = _create_user(role=Role.CHEMIST, username='chemist1', must_change_password=False)
        chemist2 = _create_user(role=Role.CHEMIST, username='chemist2', must_change_password=False)
        _make_sample_and_assignment(officer.id, chemist.id, 'FOOD-001')
        _make_sample_and_assignment(officer.id, chemist2.id, 'FOOD-002')

    _login(client, username='officer')
    resp = client.get('/api/assignments/records')
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data['records']) == 2


def test_api_records_analyst_sees_only_own(app, client):
    with app.app_context():
        officer = _create_user(role=Role.OFFICER, username='officer', must_change_password=False)
        chemist = _create_user(role=Role.CHEMIST, username='chemist1', must_change_password=False)
        chemist2 = _create_user(role=Role.CHEMIST, username='chemist2', must_change_password=False)
        _make_sample_and_assignment(officer.id, chemist.id, 'FOOD-001')
        _make_sample_and_assignment(officer.id, chemist2.id, 'FOOD-002')
        chemist_id = chemist.id

    _login(client, username='chemist1')
    resp = client.get('/api/assignments/records')
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data['records']) == 1
    assert data['records'][0]['assignment']['analystId'] == str(chemist_id)


def test_api_records_overdue_flag(app, client):
    with app.app_context():
        officer = _create_user(role=Role.OFFICER, username='officer', must_change_password=False)
        chemist = _create_user(role=Role.CHEMIST, username='chemist1', must_change_password=False)
        _make_sample_and_assignment(
            officer.id, chemist.id, 'FOOD-003',
            expected_completion=date.today() - timedelta(days=3),
        )

    _login(client, username='officer')
    resp = client.get('/api/assignments/records')
    data = resp.get_json()
    assert data['records'][0]['assignment']['overdue'] is True
    assert data['records'][0]['assignment']['priority'] == 'STAT'


def test_api_analysts_workload(app, client):
    with app.app_context():
        officer = _create_user(role=Role.OFFICER, username='officer', must_change_password=False)
        chemist = _create_user(role=Role.CHEMIST, username='chemist1', must_change_password=False)
        _make_sample_and_assignment(officer.id, chemist.id, 'FOOD-004')

    _login(client, username='officer')
    resp = client.get('/api/assignments/analysts')
    assert resp.status_code == 200
    data = resp.get_json()
    names = {a['displayName']: a['workload'] for a in data['analysts']}
    assert any(w['total'] == 1 for w in names.values())


def test_api_reassign_requires_supervisor(app, client):
    with app.app_context():
        officer = _create_user(role=Role.OFFICER, username='officer', must_change_password=False)
        chemist = _create_user(role=Role.CHEMIST, username='chemist1', must_change_password=False)
        chemist2 = _create_user(role=Role.CHEMIST, username='chemist2', must_change_password=False)
        _, assignment = _make_sample_and_assignment(officer.id, chemist.id, 'FOOD-005')
        assignment_id = assignment.id
        chemist2_id = chemist2.id

    _login(client, username='chemist1')
    resp = client.post(
        f'/api/assignments/{assignment_id}/reassign',
        json={'newAnalystId': chemist2_id, 'reason': 'Workload balancing'},
    )
    assert resp.status_code == 403


def test_api_reassign_success(app, client):
    with app.app_context():
        officer = _create_user(role=Role.OFFICER, username='officer', must_change_password=False)
        chemist = _create_user(role=Role.CHEMIST, username='chemist1', must_change_password=False)
        chemist2 = _create_user(role=Role.CHEMIST, username='chemist2', must_change_password=False)
        _, assignment = _make_sample_and_assignment(officer.id, chemist.id, 'FOOD-006')
        assignment_id = assignment.id
        chemist2_id = chemist2.id

    _login(client, username='officer')
    resp = client.post(
        f'/api/assignments/{assignment_id}/reassign',
        json={'newAnalystId': chemist2_id, 'reason': 'Workload balancing'},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['record']['assignment']['analystId'] == str(chemist2_id)

    with app.app_context():
        updated = db.session.get(SampleAssignment, assignment_id)
        assert updated.chemist_id == chemist2_id


def test_api_reassign_requires_reason_when_moving_from_analyst(app, client):
    with app.app_context():
        officer = _create_user(role=Role.OFFICER, username='officer', must_change_password=False)
        chemist = _create_user(role=Role.CHEMIST, username='chemist1', must_change_password=False)
        chemist2 = _create_user(role=Role.CHEMIST, username='chemist2', must_change_password=False)
        _, assignment = _make_sample_and_assignment(officer.id, chemist.id, 'FOOD-007')
        assignment_id = assignment.id
        chemist2_id = chemist2.id

    _login(client, username='officer')
    resp = client.post(
        f'/api/assignments/{assignment_id}/reassign',
        json={'newAnalystId': chemist2_id, 'reason': ''},
    )
    assert resp.status_code == 400
