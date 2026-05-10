"""
Tests for verify_firebase_uid() and the /api/user route.

Firebase Admin SDK is mocked at import time so no real credentials
or network calls are needed to run these tests.
"""
import sys
import os
import unittest
from unittest.mock import patch, MagicMock

import firebase_admin
import firebase_admin.auth

_patcher_init = patch('firebase_admin.initialize_app')
_patcher_cert = patch('firebase_admin.credentials.Certificate')
_patcher_init.start()
_patcher_cert.start()

os.environ.setdefault('FLASK_SECRET_KEY', 'test-secret-key')
os.environ.setdefault('FIREBASE_SERVICE_ACCOUNT_PATH', 'fake.json')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import app as flask_app


# ─────────────────────────────────────────────
# Helper: fake context manager for get_connection
# ─────────────────────────────────────────────
def _mock_conn():
    conn = MagicMock()
    ctx = MagicMock()
    ctx.__enter__ = MagicMock(return_value=conn)
    ctx.__exit__ = MagicMock(return_value=False)
    return ctx, conn


# ─────────────────────────────────────────────
# Unit tests: verify_firebase_uid()
# ─────────────────────────────────────────────
class TestVerifyFirebaseUid(unittest.TestCase):

    @patch('firebase_admin.auth.get_user')
    def test_existing_uid_returns_true(self, mock_get_user):
        mock_get_user.return_value = MagicMock()
        result = flask_app.verify_firebase_uid('uid_abc123')
        self.assertTrue(result)
        mock_get_user.assert_called_once_with('uid_abc123')

    @patch('firebase_admin.auth.get_user')
    def test_nonexistent_uid_returns_false(self, mock_get_user):
        mock_get_user.side_effect = firebase_admin.auth.UserNotFoundError('Not found')
        result = flask_app.verify_firebase_uid('uid_does_not_exist')
        self.assertFalse(result)

    @patch('firebase_admin.auth.get_user')
    def test_empty_string_not_in_firebase_returns_false(self, mock_get_user):
        mock_get_user.side_effect = firebase_admin.auth.UserNotFoundError('Not found')
        result = flask_app.verify_firebase_uid('')
        self.assertFalse(result)


# ─────────────────────────────────────────────
# Integration tests: POST /api/user
# ─────────────────────────────────────────────
class TestApiUserRoute(unittest.TestCase):

    def setUp(self):
        flask_app.app.config['TESTING'] = True
        flask_app.app.config['SECRET_KEY'] = 'test-secret-key'
        self.client = flask_app.app.test_client()

    # --- Login: valid UID ---

    @patch('app.verify_firebase_uid', return_value=True)
    def test_login_valid_uid_returns_200(self, _):
        ctx, conn = _mock_conn()
        with patch('app.dbquery.get_connection', return_value=ctx), \
             patch('app.dbquery.get_usuario_by_firebase_uid', return_value=1):
            response = self.client.post('/api/user', json={
                'uid': 'valid_uid_abc',
                'emailVerified': True,
            })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['status'], 'logged_in')

    @patch('app.verify_firebase_uid', return_value=True)
    def test_login_sets_session_values(self, _):
        ctx, conn = _mock_conn()
        with patch('app.dbquery.get_connection', return_value=ctx), \
             patch('app.dbquery.get_usuario_by_firebase_uid', return_value=5):
            with self.client as c:
                c.post('/api/user', json={
                    'uid': 'valid_uid_abc',
                    'emailVerified': True,
                })
                with c.session_transaction() as sess:
                    self.assertEqual(sess['uid'], 'valid_uid_abc')
                    self.assertTrue(sess['email_verified'])
                    self.assertTrue(sess['user_loggedin'])

    # --- Login: UID not in Firebase ---

    @patch('app.verify_firebase_uid', return_value=False)
    def test_login_unrecognized_uid_returns_400(self, _):
        response = self.client.post('/api/user', json={
            'uid': 'fake_uid_000',
            'emailVerified': False,
        })
        self.assertEqual(response.status_code, 400)

    # --- Login: new user gets inserted into SQLite ---

    @patch('app.verify_firebase_uid', return_value=True)
    def test_new_user_gets_inserted_into_db(self, _):
        import hashlib
        uid = 'new_uid_999'
        expected_hash = hashlib.sha256(uid.encode()).hexdigest()
        ctx, conn = _mock_conn()
        with patch('app.dbquery.get_connection', return_value=ctx), \
             patch('app.dbquery.get_usuario_by_firebase_uid', return_value=None), \
             patch('app.dbquery.insert_usuario', return_value=42) as mock_insert:
            response = self.client.post('/api/user', json={
                'uid': uid,
                'emailVerified': True,
            })
        mock_insert.assert_called_once_with(conn, expected_hash)
        self.assertEqual(response.status_code, 200)

    # --- Logout ---

    def test_logout_uid_none_returns_200(self):
        response = self.client.post('/api/user', json={'uid': None})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['status'], 'logged_out')

    def test_logout_clears_session(self):
        with self.client as c:
            with c.session_transaction() as sess:
                sess['uid'] = 'some_uid'
                sess['user_loggedin'] = True
            c.post('/api/user', json={'uid': None})
            with c.session_transaction() as sess:
                self.assertNotIn('uid', sess)
                self.assertFalse(sess.get('user_loggedin'))


if __name__ == '__main__':
    unittest.main(verbosity=2)
