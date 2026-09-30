"""Isolated API/security regression suite: python -m unittest discover -s tests -v."""
import base64
import concurrent.futures
import json
import os
from pathlib import Path
import tempfile
import unittest
from cryptography.fernet import Fernet

ROOT = Path(__file__).resolve().parents[1]
TEMP = tempfile.TemporaryDirectory(prefix='sug-tests-')
os.environ.update(DATABASE_URL='sqlite:///' + TEMP.name + '/test.db', SECRET_KEY=Fernet.generate_key().decode(), BIOMETRIC_ENCRYPTION_KEY=Fernet.generate_key().decode(), ADMIN_EMAIL='admin@example.org', ADMIN_REGISTRATION_NUMBER='TESTADMIN', ADMIN_PASSWORD='LocalTestingPassword', YUNET_MODEL_PATH=str(ROOT / 'yunet.onnx'), SFACE_MODEL_PATH=str(ROOT / 'sface.onnx'))
from fastapi.testclient import TestClient
from app.main import app
from app import db, models, security
from app.rate_limiter import limiter
limiter.enabled = False  # Exercise security independently of the per-IP request budget.


class FunctionalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.admin = {'Authorization': 'Bearer ' + cls.client.post('/api/auth/login', json={'email': 'admin@example.org', 'password': 'LocalTestingPassword'}).json()['access_token']}

    def student(self, name):
        payload = dict(full_name=name, email=name+'@example.org', registration_number=name, password='Password123', confirm_password='Password123')
        response = self.client.post('/api/auth/register', json=payload)
        self.assertEqual(response.status_code, 200, response.text)
        sid = response.json()['id']
        login = self.client.post('/api/auth/login', json={'email': payload['email'], 'password': payload['password']})
        self.assertEqual(login.status_code, 200)
        return sid, {'Authorization': 'Bearer ' + login.json()['access_token']}, payload

    def election(self):
        election = self.client.post('/api/admin/elections', headers=self.admin, json={'name': self.id()}).json()
        position = self.client.post(f"/api/admin/elections/{election['id']}/positions", headers=self.admin, json={'name': 'Test position'}).json()
        candidate = self.client.post(f"/api/admin/positions/{position['id']}/candidates", headers=self.admin, json={'full_name': 'Test candidate', 'cgpa': 4.42, 'manifesto': 'Test description'}).json()
        self.assertIn('id', candidate, candidate)
        self.assertEqual(self.client.put(f"/api/admin/elections/{election['id']}/status?status=active", headers=self.admin).status_code, 200)
        return election['id'], {str(position['id']): candidate['id']}

    def test_registration_and_access(self):
        sid, headers, payload = self.student('registration')
        self.assertFalse(self.client.get('/api/student/profile', headers=headers).json()['has_enrolled'])
        self.assertNotIn('biometric_reference', self.client.get('/api/student/profile', headers=headers).json())
        self.assertIn(self.client.post('/api/auth/register', json=payload).status_code, [400, 409])
        payload['email'] = 'another@example.org'
        self.assertIn('Registration number', self.client.post('/api/auth/register', json=payload).json()['detail'])
        self.assertEqual(self.client.get('/api/admin/voters', headers=headers).status_code, 403)
        self.assertEqual(self.client.get('/api/admin/voters').status_code, 401)
        eid, _ = self.election()
        self.assertEqual(self.client.post(f'/api/elections/{eid}/ballot/authorize', headers=headers, files={'file': ('image.jpg', b'invalid', 'image/jpeg')}).status_code, 403)
        self.assertEqual(self.client.post(f'/api/elections/{eid}/voting-session?student_id={sid}').status_code, 404)

    def test_election_graph_and_validation(self):
        eid, selections = self.election()
        graph = self.client.get('/api/elections/active').json()
        self.assertEqual(graph['id'], eid)
        self.assertEqual(graph['positions'][0]['candidates'][0]['cgpa'], 4.42)
        pid = next(iter(selections))
        cid = selections[pid]
        edited = self.client.put(f'/api/admin/candidates/{cid}', headers=self.admin, json={'full_name': 'Updated candidate', 'cgpa': 4.11, 'manifesto': 'Updated description'})
        self.assertEqual(edited.status_code, 200)
        self.assertEqual(self.client.get('/api/elections/active').json()['positions'][0]['candidates'][0]['cgpa'], 4.11)
        self.assertEqual(self.client.put(f'/api/admin/positions/{pid}', headers=self.admin, json={'name': 'Updated position'}).status_code, 200)
        self.assertEqual(self.client.put(f'/api/admin/elections/{eid}', headers=self.admin, json={'name': 'Updated election'}).status_code, 200)
        self.assertEqual(self.client.post(f'/api/admin/positions/{pid}/candidates', headers=self.admin, json={'full_name':'Invalid', 'cgpa':-1}).status_code, 422)
        self.assertEqual(self.client.put(f'/api/admin/elections/{eid}/status?status=invalid', headers=self.admin).status_code, 400)

    def test_image_validation(self):
        import cv2
        import numpy as np
        endpoint = '/api/admin/upload-candidate-photo'
        self.assertEqual(self.client.post(endpoint, headers=self.admin, files={'file': ('fake.jpg', b'<script>bad</script>', 'image/jpeg')}).status_code, 400)
        _, data = cv2.imencode('.png', np.zeros((100, 100, 3), dtype=np.uint8))
        response = self.client.post(endpoint, headers=self.admin, files={'file': ('../../photo.png', data.tobytes(), 'image/png')})
        self.assertEqual(response.status_code, 200, response.text)
        url = response.json()['url']
        image = self.client.get(url)
        self.assertEqual(image.status_code, 200)
        self.assertEqual(image.headers['content-type'], 'image/jpeg')
        (ROOT / 'app/static' / url.lstrip('/')).unlink()

    def test_real_biometrics_and_concurrent_ballots(self):
        for file in ['test_faces/face1.jpg', 'test_faces/face2.jpg', 'yunet.onnx', 'sface.onnx']:
            if not (ROOT / file).exists(): self.skipTest('Real face fixtures and recognition models are required: ' + file)
        sid, headers, _ = self.student('biometric')
        def photo(name='face1.jpg'):
            return {'file': (name, (ROOT/'test_faces'/name).read_bytes(), 'image/jpeg')}
        self.assertEqual(self.client.post('/api/biometric/enroll', headers=headers, files=photo('no_face.jpg')).status_code, 400)
        response = self.client.post('/api/biometric/enroll', headers=headers, files=photo())
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.post('/api/biometric/enroll', headers=headers, files=photo('face2.jpg')).status_code, 409)
        eid, selections = self.election()
        endpoint = f'/api/elections/{eid}/ballot'
        self.assertEqual(self.client.post(endpoint+'/authorize', headers=headers, files=photo('face2.jpg')).status_code, 403)
        first = self.client.post(endpoint+'/authorize', headers=headers, files=photo()).json()['voting_token']
        second = self.client.post(endpoint+'/authorize', headers=headers, files=photo()).json()['voting_token']
        body = {'voting_token': first, 'encrypted_ballot': base64.b64encode(json.dumps(selections).encode()).decode()}
        self.assertEqual(self.client.post(endpoint+'/cast', json=body).status_code, 403)
        body['voting_token'] = second
        self.assertEqual(self.client.post(f'/api/elections/{eid+100}/ballot/cast', json=body).status_code, 403)
        invalid = dict(body, encrypted_ballot=base64.b64encode(b'{}').decode())
        self.assertEqual(self.client.post(endpoint+'/cast', json=invalid).status_code, 400)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            codes = list(pool.map(lambda _: self.client.post(endpoint+'/cast', json=body).status_code, range(2)))
        self.assertEqual(sorted(codes), [200, 403])
        self.assertEqual(self.client.post(endpoint+'/authorize', headers=headers, files=photo()).status_code, 403)
        results = self.client.get(f'/api/admin/elections/{eid}/results', headers=self.admin).json()
        self.assertEqual(results['total_ballots'], 1)
        self.assertEqual(results['valid_ballots'], 1)
        self.assertNotIn('student_id', models.Ballot.__table__.columns)

if __name__ == '__main__': unittest.main()
