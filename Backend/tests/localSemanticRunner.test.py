"""Stdlib-only offline-runner rejection checks; no model/spaCy installation needed."""
import importlib.util, io, json, pathlib, subprocess, sys, tempfile, unittest
from unittest.mock import patch
SCRIPT = pathlib.Path(__file__).resolve().parents[1] / 'scripts/localSemanticVectors.py'
spec = importlib.util.spec_from_file_location('local_semantic_runner', SCRIPT)
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

class Rejections(unittest.TestCase):
    def check_request(self, request, model):
        data = request if isinstance(request, bytes) else json.dumps(request).encode()
        with patch.object(sys, 'argv', [str(SCRIPT), str(model)]), patch.object(sys, 'stdin', io.TextIOWrapper(io.BytesIO(data))):
            with self.assertRaises(ValueError):
                runner.main()

    def test_invalid_payloads_never_import_or_run_model(self):
        with tempfile.TemporaryDirectory() as model:
            for request in [{'texts':['one']}, {'texts':['one','two'],'verified':True}, {'texts':['x'*501,'two']}, {'texts':['x']*26}, {'texts':[None,'two']}, b'x'*65537, b'invalid-json']:
                with self.subTest(request_type=type(request).__name__):
                    self.check_request(request, model)

    def test_missing_tampered_and_unknown_model_resources(self):
        with tempfile.TemporaryDirectory() as model:
            self.check_request({'texts':['one','two']}, model)
            (pathlib.Path(model)/'config.cfg').write_text('Synthetic tampered config')
            self.check_request({'texts':['one','two']}, model)
            (pathlib.Path(model)/'unknown.py').write_text('raise Exception("Never execute")')
            self.check_request({'texts':['one','two']}, model)

    def test_symlink_root_and_child_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            model=pathlib.Path(root)/'model';model.mkdir()
            link=pathlib.Path(root)/'alias';link.symlink_to(model,target_is_directory=True)
            self.check_request({'texts':['one','two']},link)
            (model/'config.cfg').symlink_to(SCRIPT)
            self.check_request({'texts':['one','two']},model)

    def test_cli_failure_is_sanitized(self):
        result=subprocess.run([sys.executable,'-I',str(SCRIPT),'/nonexistent-synthetic-only'],input=b'{"texts":["DO_NOT_LOG_PRIVATE_TEXT","two"]}',capture_output=True)
        self.assertEqual(result.returncode,1)
        self.assertEqual(result.stdout,b'')
        self.assertEqual(result.stderr,b'LOCAL_SEMANTIC_REJECTED\n')

if __name__=='__main__':
    unittest.main()
