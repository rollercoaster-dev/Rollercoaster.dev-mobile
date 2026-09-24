import plistlib
import tempfile
import unittest
from pathlib import Path
from install import install


class InstallTests(unittest.TestCase):
    def test_upgrade_preserves_state_and_points_service_at_installed_runtime(self):
        source = Path(__file__).resolve().parents[2]
        with tempfile.TemporaryDirectory() as d:
            home = Path(d)
            link, agent = install(source, home, '/usr/bin/python3')
            old = Path(link).resolve()
            state = home / '.local/state/rollercoaster-pm'
            (state / 'existing-state').write_text('keep')
            link, agent = install(source, home, '/usr/bin/python3')
            self.assertNotEqual(Path(link).resolve(), old)
            self.assertEqual((state / 'existing-state').read_text(), 'keep')
            self.assertTrue((Path(link) / 'scripts/project_manager/pm.py').is_file())
            command = home / '.local/bin/rollercoaster-pm'
            self.assertTrue(command.is_symlink())
            self.assertEqual(command.resolve(), (Path(link) / 'scripts/project_manager/run-manager.sh').resolve())
            config = plistlib.loads(Path(agent).read_bytes())
            self.assertEqual(config['ProgramArguments'][1], str(Path(link) / 'scripts/project_manager/telegram_bridge.py'))
            self.assertNotIn(str(source), str(config))
            self.assertEqual(config['KeepAlive'], True)


if __name__ == '__main__': unittest.main()
